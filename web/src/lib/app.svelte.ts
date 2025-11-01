import {
	ConnectionCloseCode,
	createClientManager,
	type ClientOptions,
	type ConnectionState,
	type WRPCClientManager
} from '@judgesroom.com/wrpc/client';
import type { Judge, JudgeGroup } from '@judgesroom.com/protocol/src/judging';
import type { DeviceInfo } from '@judgesroom.com/protocol/src/client';
import type { EssentialData } from '@judgesroom.com/protocol/src/event';
import type { TeamData, TeamInfo } from '@judgesroom.com/protocol/src/team';
import type { Award } from '@judgesroom.com/protocol/src/award';
import type { ServerRouter } from '@judgesroom.com/worker/src/server-router';
import { clientRouter, type ClientRouter } from './client-router';
import type { User } from './user.svelte';
import { generateUUID, getDeviceNameFromUserAgent, parseJudgesRoomUrl, processTeamDataArray } from './utils.svelte';
import { AppUI } from './index.svelte';
import type { TeamInfoAndData } from './team.svelte';
import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
import type { JoiningKit } from '@judgesroom.com/worker/src/routes/handshake';
import z from 'zod';
import { Preferences } from './preferences.svelte';

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
	deviceName: z.string().min(1).max(100)
});

export type Permit = z.infer<typeof PermitSchema>;

export class App {
	private readonly storage: AppStorage;
	private readonly isDevelopment: boolean;
	private readonly clientManager: WRPCClientManager<ServerRouter, ClientRouter>;
	private readonly preferences: Preferences;
	private connectionState: ConnectionState = $state('offline');
	private permit: Permit | null = $state(null);
	private currentUser: User | null = $state(null);
	private essentialData: EssentialData | null = $state(null);
	private allTeamData: Record<string, TeamData> = $state({});
	private allJudges: readonly Judge[] = $state([]);
	private allDevices: readonly DeviceInfo[] = $state([]);
	private allFinalAwardNominations: Record<string, AwardNomination[]> = $state({});
	public readonly version: string = '0.1.3';

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

	private async joinJudgesRoom(): Promise<void> {
		if (!this.hasPermit()) {
			throw new Error('CRITICAL: No permit');
		}

		if (this.getConnectionState() === 'connected') {
			throw new Error("CRITICAL: already connected to a Judges' Room");
		}

		// Just to be safe, reset the client manager
		this.clientManager.resetClient();

		// Join the Judges' Room, this will call createWRPCClient
		const starterKit = await this.wrpcClient.handshake.joinJudgesRoom.mutation();
		this.handleEventSetupUpdate(starterKit);

		// Load user from storage
		const user = this.loadUserFromStorage();
		if (user) {
			this.currentUser = user;

			if (user.role === 'judge') {
				const find = this.allJudges.find((judge) => judge.id === user.judge.id);
				if (find) {
					this.currentUser = user;
				} else {
					this.clearCurrentUser('judge_deleted');
				}
			}
		}
	}

	/**
	 * Join a Judges' Room from URL
	 */
	async joinJudgesRoomFromUrl(url: string): Promise<void> {
		try {
			if (this.hasPermit()) {
				throw new Error("CRITICAL: already in a Judges' Room");
			}

			const roomId = parseJudgesRoomUrl(url);
			if (!roomId) {
				throw new Error("Invalid Judges' Room URL");
			}

			this.permit = this.createNewPermit(roomId);
			this.savePermitToStorage();

			await this.joinJudgesRoom();
		} catch (error) {
			this.addErrorNotice(`Failed to join Judges\' Room: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
	getJudgesRoomUrl(): string {
		if (!this.permit?.roomId) {
			throw new Error("CRITICAL: No active Judges' Room");
		}
		return `${window.location.origin}${window.location.pathname}#${this.permit.roomId}`;
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

			const roomId = generateUUID();
			this.permit = this.createNewPermit(roomId);

			if (!this.essentialData) {
				throw new Error('CRITICAL: No essential data');
			}

			const response = await this.wrpcClient.handshake.createJudgesRoom.mutation({
				essentialData: this.essentialData,
				teamData: [...Object.values(this.allTeamData)],
				judges: [...this.allJudges]
			});
			if (response.success) {
				this.savePermitToStorage();
			} else {
				this.permit = null;
				this.clearPermitFromStorage();
				throw new Error(response.message);
			}
		} catch (error) {
			this.permit = null;
			this.clearPermitFromStorage();
			this.addErrorNotice(`Failed to create Judges' Room: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
		// Clear local Judges' Room data
		this.permit = null;
		this.currentUser = null;
		this.essentialData = null;
		this.allTeamData = {};
		this.allJudges = [];
		this.allDevices = [];
		this.allFinalAwardNominations = {};
		// no client-held room id field to clear
		this.clientManager.resetClient();

		// Clear storage
		this.clearPermitFromStorage();
		this.clearUserFromStorage();
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
		try {
			await this.joinJudgesRoom();
		} catch (error) {
			// Do not clear permit from storage, the user might be able to connect to the Judges' Room again
			// this.clearPermitFromStorage();
			this.addErrorNotice(`Failed to reconnect to Judges\' Room: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	handleEventSetupUpdate(data: Readonly<JoiningKit>): void {
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

	getTeamCount(): number {
		return this.essentialData?.teamInfos.length || 0;
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
			this.addErrorNotice(`Failed to kick device: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
		if (user.role === 'judge') {
			await this.wrpcClient.judge.updateJudge.mutation(user.judge);
		}

		this.currentUser = user;
		this.saveUserToStorage();
	}

	async unselectUser(): Promise<void> {
		this.currentUser = null;
		this.saveUserToStorage();
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

	// ============================================================================
	// Private Methods
	// ============================================================================

	private createClientOptions(): ClientOptions<ClientRouter> {
		const wsUrl = this.isDevelopment
			? `ws://${window.location.hostname}:8787/ws` // Local development server
			: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`; // Production Cloudflare Worker

		if (this.permit === null) {
			throw new Error('CRITICAL: No permit');
		}

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
					this.addErrorNotice("You have been kicked from the Judges' Room");
					AppUI.appPhase = 'leaving';
				} else if (code === ConnectionCloseCode.ROOM_DESTROYED) {
					this.addErrorNotice("The Judges' Room has been destroyed");
					AppUI.appPhase = 'leaving';
				}
			},
			onConnectionStateChange: (state) => {
				this.connectionState = state;
			}
		};
	}

	/**
	 * Clear current user with reason
	 */
	private clearCurrentUser(reason: string): void {
		this.currentUser = null;
		this.clearUserFromStorage();
	}

	private createNewPermit(roomId: string): Permit {
		const deviceId = generateUUID();
		const deviceName = getDeviceNameFromUserAgent();
		return { roomId, deviceId, deviceName, createdAt: Date.now() };
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
