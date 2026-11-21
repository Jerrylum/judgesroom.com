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
import { normalizeRubricScoreStep, type EssentialData } from '@judgesroom.com/protocol/src/event';
import type { TeamData, TeamInfo } from '@judgesroom.com/protocol/src/team';
import type { Award } from '@judgesroom.com/protocol/src/award';
import type { ServerRouter } from '@judgesroom.com/worker/src/server-router';
import { clientRouter, type ClientRouter } from './client-router';
import type { User } from './user.svelte';
import {
	buildJudgesRoomJoinUrl,
	errorToString,
	generateUUID,
	getDeviceNameFromUserAgent,
	parseAuthTokenFromUrl,
	parseJudgesRoomUrl,
	processTeamDataArray
} from './utils.svelte';
import { AppUI } from './index.svelte';
import type { TeamInfoAndData } from './team.svelte';
import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
import type { JoiningKit, RoomState, StarterKit } from '@judgesroom.com/protocol/src/room';
import {
	AuthTokenSchema,
	ClientAuthenticationSchema,
	ConnectAuthCloseReason,
	isConnectAuthCloseReason,
	type ClientAuthentication
} from '@judgesroom.com/protocol/src/access';
import {
	LeftJudgesRoomCloseReason,
	RoomIdSchema,
	RoomNotFoundCloseReason,
	TurnstileVerificationFailedCloseReason,
	WebSocketConnectionFailedCloseReason
} from '@judgesroom.com/protocol/src/room-id';
import z from 'zod';
import { Preferences } from './preferences.svelte';
import { connectionResumeStep } from './session-resume';
import { forgetJudgeGuideNoticeDismissals } from './judge-guide-notice';

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
	roomId: RoomIdSchema,
	createdAt: z.number().int().positive(),
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(100),
	authToken: AuthTokenSchema.optional()
});

export type Permit = z.infer<typeof PermitSchema>;

const CreateRoomResponseSchema = z.object({
	roomId: RoomIdSchema,
	authentication: ClientAuthenticationSchema
});

export class App {
	private readonly storage: AppStorage;
	private readonly isDevelopment: boolean;
	private readonly clientManager: WRPCClientManager<ServerRouter, ClientRouter>;
	private readonly preferences: Preferences;
	private connectionState: ConnectionState = $state('offline');
	/**
	 * Stores the server's close reason for the current operation.
	 * Each operation clears the old value before connecting. If `onClosed` records a new reason,
	 * the caller can consume it with `takeConnectionCloseReason()` after the operation rejects.
	 */
	private connectionCloseReason: string | null = $state(null);
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
	/** wrpc goes reconnecting → connecting → connected; remember the first hop. */
	private reconnectPending = false;
	private allFinalAwardNominations: Record<string, AwardNomination[]> = $state({});
	private awardsWithNoWinner: string[] = $state([]);
	public readonly version: string = '2.6.0-beta.1';

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

		this.clientManager.resetClient();
		return this.loadJoiningKit();
	}

	/**
	 * The socket is already connected and this page is already in the room.
	 * Reload the room on that socket and restore subscriptions.
	 */
	private async rejoinJudgesRoom(): Promise<void> {
		if (!this.isJudgesRoomJoined()) {
			throw new Error("CRITICAL: not in a Judges' Room");
		}
		if (this.getConnectionState() !== 'connected') {
			throw new Error("CRITICAL: not connected to a Judges' Room");
		}

		await this.loadJoiningKit();
		this.sessionEpoch += 1;
		this.subscribeDeviceListIfRetained();
	}

	private async loadJoiningKit(): Promise<JoiningKit> {
		const generation = ++this.resumeGeneration;
		const client = this.wrpcClient;
		const joiningKit = await client.handshake.joinJudgesRoom.mutation();
		if (generation !== this.resumeGeneration || this.wrpcClient !== client || !this.hasPermit()) {
			throw new Error('Join superseded');
		}

		this.handleEventSetupUpdate(joiningKit);
		this.handleClientAuthenticationChange(joiningKit.authentication);
		return joiningKit;
	}

	/**
	 * Join a Judges' Room from URL.
	 * After rejection, callers may call `takeConnectionCloseReason()` for a more specific server close reason.
	 */
	async joinJudgesRoomFromUrl(url: string): Promise<void> {
		try {
			this.connectionCloseReason = null;

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
			this.permit = null;
			this.clearPermitFromStorage();
			this.clearUserFromStorage();

			throw error;
		}
	}

	/**
	 * Reconnect to a stored Judges' Room.
	 * After rejection, callers may call `takeConnectionCloseReason()` for a more specific server close reason.
	 * This method inspects the reason when deciding whether to discard the permit, but does not consume it.
	 */
	async joinJudgesRoomWithStoredPermit(): Promise<void> {
		try {
			// Discard any reason from an earlier connection.
			this.connectionCloseReason = null;
			await this.joinJudgesRoom();
		} catch (error) {
			const reason = this.connectionCloseReason || errorToString(error);
			if (isConnectAuthCloseReason(reason) && reason !== ConnectAuthCloseReason.TOO_MANY_CONNECTIONS) {
				this.permit = null;
				this.clearPermitFromStorage();
				this.clearUserFromStorage();
			}
			throw error;
		}
	}

	/**
	 * The socket stops retrying after several failures and stays on `error`.
	 * Open a new one and rejoin. Tabs stay mounted, so an unsaved rubric is kept.
	 * After rejection, callers may call `takeConnectionCloseReason()` for a more specific server close reason.
	 */
	async resumeJudgesRoom(): Promise<void> {
		if (this.connectionState !== 'error' || !this.isJudgesRoomJoined()) {
			return;
		}

		this.connectionCloseReason = null;
		this.clientManager.resetClient();
		try {
			this.connectionCloseReason = null;

			await this.joinJudgesRoom();
			this.sessionEpoch += 1;
			this.subscribeDeviceListIfRetained();
		} catch (error) {
			throw error;
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

	getNotebookRubricScoreStep(): number {
		return normalizeRubricScoreStep(this.essentialData?.notebookRubricScoreStep);
	}

	getInterviewRubricScoreStep(): number {
		return normalizeRubricScoreStep(this.essentialData?.interviewRubricScoreStep);
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
	 * Create a new Judges' Room over HTTP, then join it. Local state is applied by the join.
	 * After rejection, callers may call `takeConnectionCloseReason()` for a more specific server close reason.
	 */
	async createJudgesRoom(input: StarterKit & { turnstileToken?: string }): Promise<void> {
		let roomCreated = false;
		try {
			// Discard any reason from an earlier connection.
			this.connectionCloseReason = null;
			this.currentUser = null;
			this.clientManager.resetClient();
			this.clearPermitFromStorage();
			this.clearUserFromStorage();

			const response = await fetch(`${this.getWorkerOrigin()}/rooms`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (response.status === 403) {
				throw new Error(TurnstileVerificationFailedCloseReason);
			}
			if (!response.ok) {
				throw new Error(await response.text());
			}

			const created = CreateRoomResponseSchema.parse(await response.json());
			const authToken = created.authentication.isAccessControlled ? created.authentication.authToken : undefined;
			this.permit = this.createNewPermit(created.roomId, authToken);
			this.savePermitToStorage();
			roomCreated = true;
			await this.joinJudgesRoom();
		} catch (error) {
			if (!roomCreated) {
				this.permit = null;
				this.clearPermitFromStorage();
				this.clearUserFromStorage();
			}
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
		// The mutation often rejects when that close lands; that is expected.
		// onClosed tells this leave from a real kick by LeftJudgesRoomCloseReason.
		try {
			if (this.getConnectionState() === 'connected') {
				await this.wrpcClient.handshake.leaveJudgesRoom.mutation();
			}
		} catch (error) {
			// Socket may already be closed by the leave close — ignore.
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
		this.reconnectPending = false;
		this.allFinalAwardNominations = {};
		this.awardsWithNoWinner = [];
		// no client-held room id field to clear
		this.clientManager.resetClient();

		// Clear storage
		this.clearPermitFromStorage();
		this.clearUserFromStorage();
		forgetJudgeGuideNoticeDismissals();
		// Leave consumes and clears any recorded close reason before returning.
		this.connectionCloseReason = null;
	}

	/**
	 * Destroy all Judges' Room data (for admin)
	 */
	async destroyJudgesRoomData(): Promise<void> {
		await this.wrpcClient.handshake.destroyJudgesRoom.mutation();
	}

	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	/**
	 * Consume and clear the recorded server close reason, if any.
	 */
	takeConnectionCloseReason(): string | null {
		const reason = this.connectionCloseReason;
		this.connectionCloseReason = null;
		return reason;
	}

	getSessionEpoch(): number {
		return this.sessionEpoch;
	}

	handleEventSetupUpdate(data: Readonly<RoomState | JoiningKit>): void {
		this.handleEssentialDataUpdate(data.essentialData);
		this.handleAllTeamDataUpdate(data.teamData);
		this.handleAllJudgesUpdate(data.judges);
		this.allFinalAwardNominations = $state.snapshot(data.finalAwardNominations);
		this.awardsWithNoWinner = $state.snapshot(data.awardsWithNoWinner);
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

	handleAwardNoWinnerUpdate(awardName: string, noWinner: boolean): void {
		if (noWinner) {
			if (!this.awardsWithNoWinner.includes(awardName)) {
				this.awardsWithNoWinner.push(awardName);
			}
			return;
		}
		this.awardsWithNoWinner = this.awardsWithNoWinner.filter((name) => name !== awardName);
	}

	getAwardsWithNoWinner(): readonly string[] {
		return $state.snapshot(this.awardsWithNoWinner);
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

	/**
	 * HTTP origin of the Worker. Vite serves the page in development, so the Worker is on port 8787.
	 * Sockets use the same origin with the WebSocket scheme.
	 */
	getWorkerOrigin(): string {
		if (this.isDevelopment) {
			const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
			return `http://${hostname}:8787`;
		}
		return typeof window !== 'undefined' ? window.location.origin : '';
	}

	private workerWebSocketUrl(): string {
		return `${this.getWorkerOrigin().replace(/^http/, 'ws')}/ws`;
	}

	// ============================================================================
	// Private Methods
	// ============================================================================

	private createClientOptions(): ClientOptions<ClientRouter> {
		if (this.permit === null) {
			throw new Error('CRITICAL: No permit');
		}

		const baseWsUrl = this.workerWebSocketUrl();

		const params = new URLSearchParams();
		if (this.permit.authToken) {
			params.set('auth', this.permit.authToken);
		}
		const query = params.toString();
		const wsUrl = query ? `${baseWsUrl}?${query}` : baseWsUrl;

		const options: ClientOptions<ClientRouter> = {
			wsUrl,
			clientId: generateUUID(),
			roomId: this.permit.roomId,
			deviceId: this.permit.deviceId,
			deviceName: this.permit.deviceName,
			onContext: async () => ({}),
			onOpen: () => {},
			onClosed: (code, reason) => {
				// Save reasons that the in-flight operation may need to report.
				if (code === ConnectionCloseCode.KICKED) {
					if (reason === LeftJudgesRoomCloseReason) {
						// Server closed us as part of leaveJudgesRoom — cleanup continues there.
						this.connectionCloseReason = reason;
						return;
					} else if (isConnectAuthCloseReason(reason)) {
						// Connection closed us due to auth denial
						// Server first accepts the connection, then closes it with an auth close reason.
						this.connectionCloseReason = reason;
						return;
					} else if (reason === RoomNotFoundCloseReason) {
						// Server closed us due to room not found.
						this.connectionCloseReason = reason;
						return;
					} else {
						// Unintentional connection close by the server.
						// This could be, for example, the Judge Advisor kicking us out.
						this.addErrorNotice(m.you_have_been_kicked_from_the_judges_room());
						AppUI.appPhase = 'leaving'; // leaveJudgesRoom will be executed there.
					}
				} else if (code === ConnectionCloseCode.ROOM_DESTROYED) {
					// Server closed us due to Judge Advisor destroying the room.
					this.addErrorNotice(m.the_judges_room_has_been_destroyed());
					AppUI.appPhase = 'leaving'; // leaveJudgesRoom will be executed there.
				} else {
					// Unintentional connection close by various reasons.
					// We keep the error silent here.
				}
			},
			onConnectionStateChange: (state) => {
				this.connectionState = state;
				const step = connectionResumeStep(state, this.isJudgesRoomJoined(), this.reconnectPending);
				this.reconnectPending = step.reconnectPending;
				if (!step.resume) {
					return;
				}
				// Only a close during this rejoin counts. A reason from an earlier socket is stale.
				this.connectionCloseReason = null;
				void this.rejoinJudgesRoom().catch((error) => {
					// Automatic reconnect consumes and clears the recorded reason internally.
					const closeReason = this.connectionCloseReason;
					this.connectionCloseReason = null;
					const reason = closeReason ?? errorToString(error);
					const message = translateConnectionCloseReason(reason);
					console.error('Failed to resume Judges Room after reconnect:', error);

					if (message) {
						this.addErrorNotice(m.failed_to_reconnect_to_judges_room({ error: message }));
					}
					// Auth denial and a missing room will not succeed on another retry.
					// closeReason is null for a plain socket drop; isConnectAuthCloseReason expects a string.
					if (closeReason && (isConnectAuthCloseReason(closeReason) || closeReason === RoomNotFoundCloseReason)) {
						AppUI.appPhase = 'leaving';
					}
				});
			}
		};
		return options;
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

export function translateConnectionCloseReason(reason: string | null): string | null {
	// No reason, no message.
	if (!reason) return null;

	if (reason === TurnstileVerificationFailedCloseReason) return m.turnstile_verification_failed_close_reason();

	// Intentional leave, part of the leaveJudgesRoom process.
	if (reason === LeftJudgesRoomCloseReason) return null;

	if (reason === ConnectAuthCloseReason.ACCESS_LINK_REQUIRED) return m.access_link_required();
	if (reason === ConnectAuthCloseReason.INVALID_ACCESS_LINK) return m.invalid_or_expired_access_link();
	if (reason === ConnectAuthCloseReason.DEVICE_AUTH_CONFLICT) return m.device_already_authenticated_with_different_credentials();
	if (reason === ConnectAuthCloseReason.TOO_MANY_CONNECTIONS) return m.too_many_connections_for_this_access_link();
	if (reason === RoomNotFoundCloseReason) return m.judges_room_not_found();

	if (reason === WebSocketConnectionFailedCloseReason) return m.websocket_connection_failed();

	return reason;
}
