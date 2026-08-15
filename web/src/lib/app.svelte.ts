import { m } from '$lib/paraglide/messages.js';
import {
	ConnectionCloseCode,
	createClientManager,
	type ClientOptions,
	type ConnectionState,
	type WRPCClientManager
} from '@jerrylum/wrpc/client';
import type { Judge, JudgeGroup } from '@judgesroom.com/protocol/src/judging';
import type { DeviceInfo } from '@judgesroom.com/protocol/src/client';
import type { EssentialData } from '@judgesroom.com/protocol/src/event';
import type { TeamData, TeamInfo } from '@judgesroom.com/protocol/src/team';
import type { Award } from '@judgesroom.com/protocol/src/award';
import type { ServerRouter } from '@judgesroom.com/worker/src/server-router';
import { clientRouter, type ClientRouter } from './client-router';
import type { User } from './user.svelte';
import {
	buildJudgesRoomJoinUrl,
	generateUUID,
	getDeviceNameFromUserAgent,
	parseAuthTokenFromUrl,
	parseJudgesRoomUrl,
	processTeamDataArray
} from './utils.svelte';
import { AppUI } from './index.svelte';
import type { TeamInfoAndData } from './team.svelte';
import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
import type { JoiningKit, RoomState } from '@judgesroom.com/protocol/src/room';
import type { ClientAuthentication } from '@judgesroom.com/protocol/src/access';
import { AuthTokenSchema, isConnectAuthCloseReason } from '@judgesroom.com/protocol/src/access';
import z from 'zod';
import { Preferences } from './preferences.svelte';
import { shouldResumeJudgesRoom } from './session-resume';

export interface Notice {
	id: string;
	message: string;
	type: 'success' | 'error';
	timestamp: number;
}

export class AppStorage {
	/**
	 * Save data to localStorage with the given key
	 * @param key - The storage key
	 * @param data - The data to save (must be JSON serializable)
	 */
	save(key: string, data: Record<string, unknown> | unknown[] | string | number | boolean | null): void {
		try {
			localStorage.setItem(key, JSON.stringify(data));
		} catch (error) {
			console.error(`Failed to save to localStorage with key "${key}":`, error);
		}
	}

	/**
	 * Load data from localStorage with the given key
	 * @param key - The storage key
	 * @returns The parsed data or null if not found or error occurred
	 */
	load<T>(key: string): T | null {
		try {
			const item = localStorage.getItem(key);
			if (item === null) {
				return null;
			}
			return JSON.parse(item) as T;
		} catch (error) {
			console.error(`Failed to load from localStorage with key "${key}":`, error);
			return null;
		}
	}

	/**
	 * Remove data from localStorage with the given key
	 * @param key - The storage key
	 */
	remove(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error(`Failed to remove from localStorage with key "${key}":`, error);
		}
	}

	/**
	 * Clear all data from localStorage
	 */
	clear(): void {
		try {
			localStorage.clear();
		} catch (error) {
			console.error('Failed to clear localStorage:', error);
		}
	}
}

export const PermitSchema = z.object({
	roomId: z.uuidv4(),
	createdAt: z.number().int().positive(),
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(100),
	authToken: AuthTokenSchema.optional()
});

export type Permit = z.infer<typeof PermitSchema>;

export class App {
	private readonly storage: AppStorage;
	private readonly isDevelopment: boolean;
	private readonly clientManager: WRPCClientManager<ServerRouter, ClientRouter>;
	private readonly preferences: Preferences;
	private connectionState: ConnectionState = $state('offline');
	/** Suppress kick toast when the server closes us as part of leaveJudgesRoom. */
	private intentionalLeave = false;
	/** Set from onClosed when the server rejects connect with an auth close code/reason. */
	private lastConnectAuthError: string | null = null;
	private permit: Permit | null = $state(null);
	private currentUser: User | null = $state(null);
	private essentialData: EssentialData | null = $state(null);
	private allTeamData: Record<string, TeamData> = $state({});
	private allJudges: readonly Judge[] = $state([]);
	private allDevices: readonly DeviceInfo[] = $state([]);
	/** UI retain count for the deviceList topic (not refcounted on the server). */
	private deviceListRetainCount = 0;
	/** Bumped after a successful reconnect resume so Workspace effects re-subscribe. */
	private sessionEpoch = $state(0);
	private resumeGeneration = 0;
	private allFinalAwardNominations: Record<string, AwardNomination[]> = $state({});
	public readonly version: string = '2.1.0';

	// Error handling
	private notices: Notice[] = $state([]);

	constructor(storage: AppStorage, isDevelopment: boolean = false) {
		this.storage = storage;
		this.isDevelopment = isDevelopment;
		this.clientManager = createClientManager(this.createClientOptions.bind(this), clientRouter);
		this.preferences = new Preferences(storage);

		if (typeof window !== 'undefined') {
			this.loadPermitFromStorage();
			this.loadUserFromStorage();
		}
	}

	// ============================================================================
	// Session, Judges' Room, Permit
	// ============================================================================

	private async joinJudgesRoom(): Promise<JoiningKit> {
		if (!this.hasPermit()) {
			throw new Error('CRITICAL: No permit');
		}

		if (this.getConnectionState() === 'connected') {
			throw new Error("CRITICAL: already connected to a Judges' Room");
		}

		// Just to be safe, reset the client manager
		this.clientManager.resetClient();

		const joiningKit = await this.wrpcClient.handshake.joinJudgesRoom.mutation();
		this.handleEventSetupUpdate(joiningKit);
		this.handleClientAuthenticationChange(joiningKit.authentication);
		return joiningKit;
	}

	/**
	 * Join a Judges' Room from URL
	 */
	async joinJudgesRoomFromUrl(url: string): Promise<void> {
		this.lastConnectAuthError = null;
		try {
			if (this.hasPermit()) {
				throw new Error("CRITICAL: already in a Judges' Room");
			}

			const roomId = parseJudgesRoomUrl(url);
			if (!roomId) {
				throw new Error("Invalid Judges' Room URL");
			}

			const authToken = parseAuthTokenFromUrl(url) ?? undefined;
			this.permit = this.createNewPermit(roomId, authToken);
			this.savePermitToStorage();

			await this.joinJudgesRoom();
		} catch (error) {
			const message = this.lastConnectAuthError ?? (error instanceof Error ? error.message : 'Unknown error');
			this.lastConnectAuthError = null;
			this.permit = null;
			this.clearPermitFromStorage();
			this.clearUserFromStorage();
			this.addErrorNotice(m.failed_to_join_judges_room({ error: message }));
			throw new Error(message);
		}
	}

	/**
	 * wrpc auto-reconnect brings the socket back but not the room session.
	 * Re-join for a fresh snapshot, then re-subscribe topics.
	 */
	private async resumeJudgesRoom(): Promise<void> {
		const generation = ++this.resumeGeneration;
		const client = this.wrpcClient;
		try {
			const joiningKit = await client.handshake.joinJudgesRoom.mutation();
			if (generation !== this.resumeGeneration || this.wrpcClient !== client || !this.isJudgesRoomJoined()) {
				return;
			}
			this.handleEventSetupUpdate(joiningKit);
			this.handleClientAuthenticationChange(joiningKit.authentication);
			this.sessionEpoch += 1;
			this.subscribeDeviceListIfRetained();
		} catch (error) {
			if (generation !== this.resumeGeneration || !this.isJudgesRoomJoined()) {
				return;
			}
			const message = error instanceof Error ? error.message : 'Unknown error';
			console.error('Failed to resume Judges Room after reconnect:', error);
			this.addErrorNotice(m.failed_to_reconnect_to_judges_room({ error: message }));
		}
	}

	/**
	 * Get permit
	 */
	getPermit(): Readonly<Permit> | null {
		return this.permit ? $state.snapshot(this.permit) : null;
	}

	/**
	 * Get Judges' Room URL for sharing
	 */
	getJudgesRoomUrl(authToken?: string | null): string {
		if (!this.permit?.roomId) {
			throw new Error("CRITICAL: No active Judges' Room");
		}
		// When AC is off, omit auth from share links even if the permit stores a JA token.
		// Pass an explicit token (including null) to override.
		const token = authToken !== undefined ? authToken : this.isAccessControlEnabled() ? (this.permit.authToken ?? null) : null;
		return buildJudgesRoomJoinUrl(window.location.origin, this.permit.roomId, token);
	}

	isAccessControlEnabled(): boolean {
		return this.essentialData?.accessControlEnabled ?? false;
	}

	handleClientAuthenticationChange(authentication: ClientAuthentication): void {
		if (!this.permit) {
			throw new Error('CRITICAL: No permit');
		}

		this.permit.authToken = authentication.isAccessControlled ? authentication.authToken : undefined;
		this.savePermitToStorage();

		if (!authentication.isAccessControlled) {
			return;
		}
		if (authentication.role === 'judge_advisor') {
			this.setCurrentUserLocally({ role: 'judge_advisor' });
			return;
		}
		const judge = this.allJudges.find((j) => j.id === authentication.judgeId);
		if (judge) {
			this.setCurrentUserLocally({ role: 'judge', judge });
		}
	}

	/**
	 * Create a new Judges' Room
	 */
	async createJudgesRoom(): Promise<void> {
		try {
			this.currentUser = null;
			this.clientManager.resetClient();

			// Clear storage
			this.clearPermitFromStorage();
			this.clearUserFromStorage();

			if (!this.essentialData) {
				throw new Error('CRITICAL: No essential data');
			}

			const roomId = generateUUID();
			// Connect without auth; server mints the JA token and returns it in authentication.
			this.permit = this.createNewPermit(roomId);
			this.savePermitToStorage();

			const authentication = await this.wrpcClient.handshake.createJudgesRoom.mutation({
				essentialData: this.essentialData,
				teamData: [...Object.values(this.allTeamData)],
				judges: [...this.allJudges]
			});
			this.handleClientAuthenticationChange(authentication);
		} catch (error) {
			this.permit = null;
			this.clearPermitFromStorage();
			this.addErrorNotice(m.failed_to_create_judges_room({ error: error instanceof Error ? error.message : 'Unknown error' }));
			throw error;
		}
	}

	/**
	 * Check if the Judges' Room is joined, it doesn't mean we are connected to the server
	 */
	isJudgesRoomJoined(): boolean {
		return this.permit !== null && this.essentialData !== null;
	}

	/**
	 * Check if the Judges' Room is joined and the user is selected, we can now go to the workspace
	 */
	isJudgingReady(): boolean {
		return this.permit !== null && this.essentialData !== null && this.getCurrentUser() !== null;
	}

	hasPermit(): boolean {
		return this.permit !== null;
	}

	/**
	 * Leave current Judges' Room
	 */
	async leaveJudgesRoom(): Promise<void> {
		// Ask the server to kick siblings, forget this device, and force-close this socket.
		// The mutation often rejects when kickClient closes us; that is expected.
		this.intentionalLeave = true;
		try {
			if (this.getConnectionState() === 'connected') {
				await this.wrpcClient.handshake.leaveJudgesRoom.mutation();
			}
		} catch (error) {
			// Socket may already be closed by kickClient — ignore.
			console.debug('leaveJudgesRoom server notify finished:', error);
		}

		// Clear local Judges' Room data
		this.permit = null;
		this.currentUser = null;
		this.essentialData = null;
		this.allTeamData = {};
		this.allJudges = [];
		this.allDevices = [];
		this.deviceListRetainCount = 0;
		this.sessionEpoch = 0;
		this.resumeGeneration += 1;
		this.allFinalAwardNominations = {};
		// no client-held room id field to clear
		this.clientManager.resetClient();

		// Clear storage
		this.clearPermitFromStorage();
		this.clearUserFromStorage();
		this.intentionalLeave = false;
	}

	/**
	 * Destroy all Judges' Room data (for admin)
	 */
	async destroyJudgesRoomData(): Promise<void> {
		await this.wrpcClient.handshake.destroyJudgesRoom.mutation();
	}

	/**
	 * Reconnect to stored Judges' Room
	 */
	async joinJudgesRoomWithStoredPermit(): Promise<void> {
		this.lastConnectAuthError = null;
		try {
			await this.joinJudgesRoom();
		} catch (error) {
			const message = this.lastConnectAuthError ?? (error instanceof Error ? error.message : 'Unknown error');
			this.lastConnectAuthError = null;
			if (message.includes('Access link') || message.includes('Invalid or expired') || message.includes('already bound')) {
				this.permit = null;
				this.clearPermitFromStorage();
				this.clearUserFromStorage();
			}
			this.addErrorNotice(m.failed_to_reconnect_to_judges_room({ error: message }));
			throw new Error(message);
		}
	}

	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	getSessionEpoch(): number {
		return this.sessionEpoch;
	}

	handleEventSetupUpdate(data: Readonly<RoomState | JoiningKit>): void {
		this.handleEssentialDataUpdate(data.essentialData);
		this.handleAllTeamDataUpdate(data.teamData);
		this.handleAllJudgesUpdate(data.judges);
		this.allFinalAwardNominations = $state.snapshot(data.finalAwardNominations);
	}

	// ============================================================================
	// Essential Data
	// ============================================================================

	/**
	 * Handle EssentialData update from server
	 */
	handleEssentialDataUpdate(data: Readonly<EssentialData>): void {
		this.essentialData = $state.snapshot(data);
	}

	/**
	 * Patch assignedTeams on existing judge groups from a full assignment snapshot.
	 */
	handleReassignTeamsUpdate(assignments: Readonly<Record<string, readonly string[]>>): void {
		if (!this.essentialData) return;

		// this.essentialData = {
		// 	...this.essentialData,
		// 	judgeGroups: this.essentialData.judgeGroups.map((group) => ({
		// 		...group,
		// 		assignedTeams: [...(assignments[group.id] ?? [])]
		// 	}))
		// };

		for (const group of this.essentialData.judgeGroups) {
			group.assignedTeams = [...(assignments[group.id] ?? [])];
		}
	}

	getEssentialData(): Readonly<EssentialData> | null {
		return this.essentialData ? $state.snapshot(this.essentialData) : null;
	}

	hasEssentialData(): boolean {
		return this.essentialData !== null;
	}

	getEventName(): string | null {
		return this.essentialData?.eventName || null;
	}

	getAllTeams(): Readonly<Readonly<TeamInfo>[]> {
		return $state.snapshot(this.essentialData?.teamInfos || []);
	}

	getAllJudgeGroups(): Readonly<Readonly<JudgeGroup>[]> {
		return $state.snapshot(this.essentialData?.judgeGroups || []);
	}

	getJudgeGroupCount(): number {
		return this.essentialData?.judgeGroups.length || 0;
	}

	getAllAwards(): Readonly<Readonly<Award>[]> {
		if (!this.essentialData) return [];
		return this.essentialData.awards;
	}

	// ============================================================================
	// Team Data
	// ============================================================================

	/**
	 * Handle all team data update from server
	 */
	handleAllTeamDataUpdate(data: Readonly<Readonly<TeamData>[]>): void {
		this.allTeamData = $state.snapshot(processTeamDataArray(data));
	}

	/**
	 * Handle team data update from server
	 */
	handleTeamDataUpdate(data: Readonly<TeamData>): void {
		this.allTeamData[data.id] = $state.snapshot(data);
	}

	getAllTeamData(): Readonly<Record<string, Readonly<TeamData>>> {
		return $state.snapshot(this.allTeamData);
	}

	// ============================================================================
	// Judges
	// ============================================================================

	handleAllJudgesUpdate(data: Readonly<Readonly<Judge>[]>): void {
		this.allJudges = $state.snapshot(data);
	}

	getAllJudges(): Readonly<Readonly<Judge>[]> {
		return $state.snapshot(this.allJudges);
	}

	getJudgeCount(): number {
		return this.allJudges.length;
	}

	// ============================================================================
	// Device Management
	// ============================================================================

	/**
	 * Handle device list update from server
	 */
	handleDeviceListUpdate(clients: Readonly<Readonly<DeviceInfo>[]>): void {
		this.allDevices = $state.snapshot(clients);
	}

	/**
	 * Subscribe to deviceList on 0→1. Callers must pair with releaseDeviceList().
	 */
	retainDeviceList(): void {
		this.deviceListRetainCount++;
		if (this.deviceListRetainCount !== 1) {
			return;
		}
		this.subscribeDeviceList();
	}

	releaseDeviceList(): void {
		if (this.deviceListRetainCount === 0) {
			return;
		}
		this.deviceListRetainCount--;
		if (this.deviceListRetainCount !== 0) {
			return;
		}
		this.wrpcClient.device.unsubscribeDeviceList.notify();
	}

	private subscribeDeviceList(): void {
		this.wrpcClient.device.subscribeDeviceList
			.mutation()
			.then((list) => {
				if (this.deviceListRetainCount === 0) return;
				this.handleDeviceListUpdate(list);
			})
			.catch((error) => {
				console.error('Failed to subscribe to device list:', error);
			});
	}

	private subscribeDeviceListIfRetained(): void {
		if (this.deviceListRetainCount === 0) {
			return;
		}
		this.subscribeDeviceList();
	}

	/**
	 * Get connected clients
	 */
	getDevices(): Readonly<Readonly<DeviceInfo>[]> {
		return $state.snapshot(this.allDevices);
	}

	/**
	 * Kick a client from Judges' Room
	 */
	async kickDevice(deviceId: string): Promise<void> {
		try {
			await this.wrpcClient.device.kickDevice.mutation({ deviceId });
		} catch (error) {
			this.addErrorNotice(m.failed_to_kick_device({ error: error instanceof Error ? error.message : 'Unknown error' }));
			throw error;
		}
	}

	// ============================================================================
	// Final Award Rankings
	// ============================================================================

	handleFinalAwardNominationsUpdate(awardName: string, data: AwardNomination[]): void {
		this.allFinalAwardNominations[awardName] = $state.snapshot(data);
	}

	getAllFinalAwardNominations(): Readonly<Record<string, Readonly<AwardNomination>[]>> {
		return $state.snapshot(this.allFinalAwardNominations);
	}

	// ============================================================================
	// Utility Methods
	// ============================================================================

	getAllAwardsInMap(): Readonly<Record<string, Readonly<Award>>> {
		const awards = this.getAllAwards();
		return awards.reduce(
			(acc, award) => {
				acc[award.name] = award;
				return acc;
			},
			{} as Record<string, Readonly<Award>>
		);
	}

	getExistingJudgesGroupedByGroup(): Readonly<Record<string, Readonly<Judge>[]>> {
		const judgeGroups = this.getAllJudgeGroups();
		const allJudges = this.allJudges;

		const groups: Record<string, Readonly<Judge>[]> = {};
		judgeGroups.forEach((group) => {
			groups[group.id] = allJudges.filter((judge) => judge.groupId === group.id);
		});

		return $state.snapshot(groups);
	}

	getAllJudgeGroupsInMap(): Readonly<Record<string, Readonly<JudgeGroup>>> {
		const judgeGroups = this.getAllJudgeGroups();
		return judgeGroups.reduce(
			(acc, group) => {
				acc[group.id] = group;
				return acc;
			},
			{} as Record<string, Readonly<JudgeGroup>>
		);
	}

	getAllTeamInfoAndData(): Readonly<Record<string, Readonly<TeamInfoAndData>>> {
		const allTeamData = this.getAllTeamData();
		return this.getAllTeams().reduce(
			(acc, team) => ({
				...acc,
				[team.id]: {
					...team,
					...allTeamData[team.id]
				}
			}),
			{} as Record<string, Readonly<TeamInfoAndData>>
		);
	}

	findTeamById(teamId: string): Readonly<TeamInfo> | null {
		const allTeams = this.getAllTeams();
		const team = allTeams.find((t) => t.id === teamId);
		return team ? $state.snapshot(team) : null;
	}

	findTeamDataById(teamId: string): Readonly<TeamData> | null {
		const allTeamData = this.getAllTeamData();
		const teamData = allTeamData[teamId];
		return teamData ? $state.snapshot(teamData) : null;
	}

	findJudgeById(judgeId: string): Readonly<Judge> | null {
		const allJudges = this.getAllJudges();
		const judge = allJudges.find((j) => j.id === judgeId);
		return judge ? $state.snapshot(judge) : null;
	}

	findJudgeGroupByJudgeId(judgeId: string): Readonly<JudgeGroup> | null {
		const judge = this.findJudgeById(judgeId);
		if (!judge) return null;

		const judgeGroup = this.getAllJudgeGroups().find((g) => g.id === judge.groupId);
		return judgeGroup ? $state.snapshot(judgeGroup) : null;
	}

	getPreferences(): Preferences {
		return this.preferences;
	}

	// ============================================================================
	// User Management
	// ============================================================================

	async selectUser(user: User): Promise<void> {
		if (this.isAccessControlEnabled()) {
			throw new Error('CRITICAL: Switching roles is disabled when access control is enabled');
		}

		if (user.role === 'judge') {
			await this.wrpcClient.judge.updateJudge.mutation(user.judge);
		}

		this.setCurrentUserLocally(user);
	}

	/** Set local role without server roster mutations (used after access-control bind). */
	setCurrentUserLocally(user: User): void {
		this.currentUser = user;
		this.saveUserToStorage();
	}

	async unselectUser(): Promise<void> {
		this.clearCurrentUser();
	}

	getCurrentUser(): Readonly<User> | null {
		return this.currentUser ? $state.snapshot(this.currentUser) : null;
	}

	getCurrentUserJudge(): Readonly<Judge> | null {
		const user = this.getCurrentUser();
		if (!user || user.role !== 'judge') return null;
		return this.findJudgeById(user.judge.id);
	}

	getCurrentUserJudgeGroup(): Readonly<JudgeGroup> | null {
		const judge = this.getCurrentUserJudge();
		if (!judge) return null;
		return this.findJudgeGroupByJudgeId(judge.id);
	}

	/**
	 * Check if a user is selected
	 */
	hasCurrentUser(): boolean {
		return this.currentUser !== null;
	}

	// ============================================================================
	// Notice Management
	// ============================================================================

	/**
	 * Add notice with type
	 */
	addNotice(message: string, type: 'success' | 'error'): void {
		const notice: Notice = {
			id: `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			message,
			type,
			timestamp: Date.now()
		};

		this.notices.push(notice);

		// Auto-remove notices after 10 seconds
		setTimeout(() => {
			const index = this.notices.findIndex((n) => n.id === notice.id);
			if (index > -1) {
				this.notices.splice(index, 1);
			}
		}, 10000);
	}

	/**
	 * Add error notice (backward compatibility)
	 */
	addErrorNotice(message: string): void {
		this.addNotice(message, 'error');
	}

	/**
	 * Add success notice
	 */
	addSuccessNotice(message: string): void {
		this.addNotice(message, 'success');
	}

	/**
	 * Get all notices
	 */
	getNotices(): readonly Notice[] {
		return $state.snapshot(this.notices);
	}

	/**
	 * Clear a specific notice by ID
	 */
	clearNotice(id: string): void {
		const index = this.notices.findIndex((n) => n.id === id);
		if (index > -1) {
			this.notices.splice(index, 1);
		}
	}

	/**
	 * Clear all notices
	 */
	clearAllNotices(): void {
		this.notices = [];
	}

	get wrpcClient() {
		return this.clientManager.getClient()[1];
	}

	get developmentMode(): boolean {
		return this.isDevelopment;
	}

	getMediaOrigin(): string {
		return this.isDevelopment
			? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8787`
			: typeof window !== 'undefined'
				? window.location.origin
				: '';
	}

	// ============================================================================
	// Private Methods
	// ============================================================================

	private createClientOptions(): ClientOptions<ClientRouter> {
		if (this.permit === null) {
			throw new Error('CRITICAL: No permit');
		}

		const baseWsUrl = this.isDevelopment
			? `ws://${window.location.hostname}:8787/ws` // Local development server
			: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`; // Production Cloudflare Worker

		const wsUrl = this.permit.authToken ? `${baseWsUrl}?auth=${encodeURIComponent(this.permit.authToken)}` : baseWsUrl;

		return {
			wsUrl,
			clientId: generateUUID(),
			roomId: this.permit.roomId,
			deviceId: this.permit.deviceId,
			deviceName: this.permit.deviceName,
			onContext: async () => ({}),
			onOpen: () => {},
			onClosed: (code, reason) => {
				if (code === ConnectionCloseCode.KICKED) {
					if (this.intentionalLeave) {
						// Server closed us as part of leaveJudgesRoom — cleanup continues there.
						return;
					}
					if (isConnectAuthCloseReason(reason)) {
						// Accept-then-close auth denial — join/reconnect catch uses this over the generic WS error.
						this.lastConnectAuthError = reason.trim();
						return;
					}
					this.permit = null;
					this.currentUser = null;
					this.clearPermitFromStorage();
					this.clearUserFromStorage();
					this.addErrorNotice(m.you_have_been_kicked_from_the_judges_room());
					AppUI.appPhase = 'leaving';
				} else if (code === ConnectionCloseCode.ROOM_DESTROYED) {
					this.addErrorNotice(m.the_judges_room_has_been_destroyed());
					AppUI.appPhase = 'leaving';
				}
			},
			onConnectionStateChange: (state) => {
				const previous = this.connectionState;
				this.connectionState = state;
				if (shouldResumeJudgesRoom(previous, state, this.isJudgesRoomJoined())) {
					void this.resumeJudgesRoom();
				}
			}
		};
	}

	/**
	 * Clear current user with reason
	 */
	private clearCurrentUser(): void {
		this.currentUser = null;
		this.clearUserFromStorage();
	}

	private createNewPermit(roomId: string, authToken?: string): Permit {
		const deviceId = generateUUID();
		const deviceName = getDeviceNameFromUserAgent();
		return {
			roomId,
			deviceId,
			deviceName,
			createdAt: Date.now(),
			authToken
		};
	}

	private loadPermitFromStorage(): Permit | null {
		const stored = this.storage.load<Permit>('permit');
		if (stored) {
			this.permit = stored;
			return stored;
		}
		return null;
	}

	private savePermitToStorage(): void {
		if (this.permit) {
			this.storage.save('permit', this.permit);
		}
	}

	private clearPermitFromStorage(): void {
		this.storage.remove('permit');
	}

	private loadUserFromStorage(): User | null {
		const stored = this.storage.load<User>('currentUser');
		if (stored) {
			this.currentUser = stored;
			return stored;
		}
		return null;
	}

	private saveUserToStorage(): void {
		if (this.currentUser) {
			this.storage.save('currentUser', this.currentUser);
		}
	}

	private clearUserFromStorage(): void {
		this.storage.remove('currentUser');
	}
}
