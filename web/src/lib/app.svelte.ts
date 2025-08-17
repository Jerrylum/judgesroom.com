import type { Judge, JudgeGroup } from '@judging.jerryio/protocol/src/judging';
import type { User } from './user.svelte';
import { getWRPCConnectionState, useWRPC } from './use-wrpc';
import type { ConnectionState } from '@judging.jerryio/wrpc/client';
import type { ClientInfo, SessionInfo } from '@judging.jerryio/protocol/src/client';
import type { EventGradeLevel } from '@judging.jerryio/protocol/src/event';
import type { EssentialData } from '@judging.jerryio/protocol/src/event';
import type { TeamInfo } from '@judging.jerryio/protocol/src/team';
import type { Award, CompetitionType } from '@judging.jerryio/protocol/src/award';
import type { JudgingMethod } from '@judging.jerryio/protocol/src/judging';

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

export class App {
	private readonly storage: AppStorage;
	private readonly isDevelopment: boolean;
	private currentUser: User | null = $state(null);

	// EssentialData cache - entirely cached on client side
	private essentialData: EssentialData | null = $state(null);

	// Session management
	private sessionInfo: SessionInfo | null = $state(null);
	private clients: ClientInfo[] = $state([]);

	// Error handling
	private errorNotices: string[] = $state([]);
	private userClearReason: 'role_deleted' | null = $state(null);

	// Judges data (separate from EssentialData as it's not part of event setup)
	private allJudges: readonly Judge[] = $state([]);

	constructor(storage?: AppStorage, isDevelopment: boolean = false) {
		this.storage = storage || new AppStorage();
		this.isDevelopment = isDevelopment;
	}

	/**
	 * Select current user (User)
	 */
	async selectUser(user: User): Promise<void> {
		if (user.role === 'judge') {
			await this.updateJudge(user.judge);
		}

		this.currentUser = user;
		this.saveUserToStorage(user);
	}

	/**
	 * Update judge with transaction support
	 */
	async updateJudge(judge: Judge): Promise<void> {
		return useWRPC().updateJudge.mutation(judge);
	}

	// ===== ESSENTIAL DATA METHODS =====

	/**
	 * Handle EssentialData update from server
	 */
	handleEssentialDataUpdate(data: EssentialData): void {
		this.essentialData = data;
		this.saveEssentialDataToStorage();
	}

	/**
	 * Get cached EssentialData
	 */
	getEssentialData(): Readonly<EssentialData> | null {
		return this.essentialData ? $state.snapshot(this.essentialData) : null;
	}

	/**
	 * Check if essential data is available
	 */
	hasEssentialData(): boolean {
		return this.essentialData !== null;
	}

	/**
	 * Get event name from cached EssentialData
	 */
	getEventName(): string | null {
		return this.essentialData?.eventName || null;
	}

	/**
	 * Get event grade level from cached EssentialData
	 */
	getEventGradeLevel(): EventGradeLevel | null {
		return this.essentialData?.eventGradeLevel || null;
	}

	/**
	 * Get competition type from cached EssentialData
	 */
	getCompetitionType(): CompetitionType | null {
		return this.essentialData?.competitionType || null;
	}

	/**
	 * Get judging method from cached EssentialData
	 */
	getJudgingMethod(): JudgingMethod | null {
		return this.essentialData?.judgingMethod || null;
	}

	/**
	 * Get all teams from cached EssentialData
	 */
	getTeams(): readonly TeamInfo[] {
		return this.essentialData?.teams || [];
	}

	/**
	 * Get team count from cached EssentialData
	 */
	getTeamCount(): number {
		return this.essentialData?.teams.length || 0;
	}

	/**
	 * Get performance awards from cached EssentialData
	 */
	getPerformanceAwards(): readonly Award[] {
		return this.essentialData?.performanceAwards || [];
	}

	/**
	 * Get judged awards from cached EssentialData
	 */
	getJudgedAwards(): readonly Award[] {
		return this.essentialData?.judgedAwards || [];
	}

	/**
	 * Get volunteer nominated awards from cached EssentialData
	 */
	getVolunteerNominatedAwards(): readonly Award[] {
		return this.essentialData?.volunteerNominatedAwards || [];
	}

	/**
	 * Get all awards from cached EssentialData
	 */
	getAllAwards(): readonly Award[] {
		if (!this.essentialData) return [];
		return [...this.essentialData.performanceAwards, ...this.essentialData.judgedAwards, ...this.essentialData.volunteerNominatedAwards];
	}

	/**
	 * Get event setup data (alias for EssentialData for compatibility)
	 */
	getEventSetup(): Readonly<EssentialData> | null {
		return this.essentialData ? $state.snapshot(this.essentialData) : null;
	}

	/**
	 * Get all team data as a lookup object (for compatibility)
	 */
	getAllTeamData(): Record<string, { notebookLink: string; excluded: boolean }> {
		if (!this.essentialData) return {};

		const teamData: Record<string, { notebookLink: string; excluded: boolean }> = {};
		this.essentialData.teams.forEach((team) => {
			teamData[team.number] = {
				notebookLink: team.data.notebookLink || '',
				excluded: team.data.excluded || false
			};
		});
		return teamData;
	}

	/**
	 * Update event setup (sends to server via updateEssentialData)
	 */
	async updateEventSetup(eventSetup: EssentialData): Promise<void> {
		try {
			await useWRPC().updateEssentialData.mutation(eventSetup);
			// The server will broadcast the update back to us via onEssentialDataUpdate
		} catch (error) {
			this.addErrorNotice(`Failed to update event setup: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Update team data (for compatibility - in new system this is part of EssentialData)
	 */
	async updateTeamData(teamNumber: string, teamData: { notebookLink: string; excluded: boolean }): Promise<void> {
		// In the new system, team data is part of EssentialData and updated via updateEssentialData
		// This method is kept for compatibility but doesn't need to do anything
		// as the team data is already updated when updateEventSetup is called
	}

	/**
	 * Get judge groups from cached EssentialData
	 */
	getJudgeGroups(): readonly JudgeGroup[] {
		return this.essentialData?.judgeGroups || [];
	}

	/**
	 * Get judge group count from cached EssentialData
	 */
	getJudgeGroupCount(): number {
		return this.essentialData?.judgeGroups.length || 0;
	}

	getExistingJudgesGroupedByGroup(): Readonly<Record<string, readonly Judge[]>> {
		const judgeGroups = this.getJudgeGroups();
		const allJudges = this.allJudges;

		const groups: Record<string, Judge[]> = {};
		judgeGroups.forEach((group) => {
			groups[group.id] = allJudges.filter((judge) => judge.groupId === group.id);
		});

		return $state.snapshot(groups);
	}

	getConnectionState(): ConnectionState {
		return getWRPCConnectionState();
	}

	findJudgeById(judgeId: string): Readonly<Judge> | null {
		const allJudges = this.getAllJudges();
		const judge = allJudges.find((j) => j.id === judgeId);
		return judge ? $state.snapshot(judge) : null;
	}

	getAllJudges(): readonly Judge[] {
		return $state.snapshot(this.allJudges);
	}

	// ===== SESSION MANAGEMENT METHODS =====

	/**
	 * Handle client list update from server
	 */
	handleClientListUpdate(clients: ClientInfo[]): void {
		this.clients = clients;
	}

	/**
	 * Get connected clients
	 */
	getClients(): readonly ClientInfo[] {
		return $state.snapshot(this.clients);
	}

	/**
	 * Get session info
	 */
	getSessionInfo(): Readonly<SessionInfo> | null {
		return this.sessionInfo ? $state.snapshot(this.sessionInfo) : null;
	}

	/**
	 * Get session URL for sharing
	 */
	getSessionUrl(): string {
		if (!this.sessionInfo?.sessionId) {
			throw new Error('No active session');
		}
		return `${window.location.origin}${window.location.pathname}#${this.sessionInfo.sessionId}`;
	}

	/**
	 * Create a new session
	 */
	async createSession(
		eventName: string,
		competitionType: CompetitionType,
		eventGradeLevel: EventGradeLevel,
		judgingMethod: JudgingMethod
	): Promise<void> {
		try {
			const response = await useWRPC().createSession.mutation({
				eventName,
				competitionType,
				eventGradeLevel,
				judgingMethod
			});

			// Fetch session info after creation
			this.sessionInfo = await useWRPC().getSessionInfo.query();

			// Fetch initial essential data
			const essentialData = await useWRPC().getEssentialData.query();
			this.handleEssentialDataUpdate(essentialData);

			// Save session to storage
			this.saveSessionToStorage();
		} catch (error) {
			this.addErrorNotice(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Join a session from URL
	 */
	async joinSessionFromUrl(url: string): Promise<void> {
		try {
			// Extract session ID from URL hash
			const hashIndex = url.indexOf('#');
			if (hashIndex === -1) {
				throw new Error('Invalid session URL: No session ID found');
			}

			const sessionId = url.substring(hashIndex + 1);
			if (!sessionId) {
				throw new Error('Invalid session URL: Empty session ID');
			}

			// Join the session
			await useWRPC().joinSession.mutation({ sessionId });

			// Fetch session info
			this.sessionInfo = await useWRPC().getSessionInfo.query();

			// Fetch essential data
			const essentialData = await useWRPC().getEssentialData.query();
			this.handleEssentialDataUpdate(essentialData);

			// Save session to storage
			this.saveSessionToStorage();
		} catch (error) {
			this.addErrorNotice(`Failed to join session: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Check if currently in a session
	 */
	isInSession(): boolean {
		return this.sessionInfo !== null && this.essentialData !== null;
	}

	/**
	 * Leave current session
	 */
	async leaveSession(): Promise<void> {
		// Clear session data
		this.sessionInfo = null;
		this.essentialData = null;
		this.clients = [];
		this.allJudges = [];
		this.currentUser = null;
		this.userClearReason = null;

		// Clear storage
		this.clearSessionFromStorage();
		this.clearEssentialDataFromStorage();
		this.clearUserFromStorage();
	}

	/**
	 * Destroy all session data (for admin)
	 */
	destroySessionData(): void {
		// This would typically call a server endpoint to destroy the session
		// For now, just leave the session locally
		this.leaveSession();
	}

	/**
	 * Kick a client from session
	 */
	async kickClient(clientId: string): Promise<void> {
		try {
			await useWRPC().kickClient.mutation({ clientId });
		} catch (error) {
			this.addErrorNotice(`Failed to kick client: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	// ===== UTILITY METHODS =====

	/**
	 * Get judge count
	 */
	getJudgeCount(): number {
		return this.allJudges.length;
	}

	/**
	 * Get current user's judge group
	 */
	getCurrentUserJudgeGroup(judgeId: string): Readonly<JudgeGroup> | null {
		const judge = this.findJudgeById(judgeId);
		if (!judge) return null;

		const judgeGroup = this.getJudgeGroups().find((g) => g.id === judge.groupId);
		return judgeGroup ? $state.snapshot(judgeGroup) : null;
	}

	/**
	 * Get user clear reason
	 */
	getUserClearReason(): 'role_deleted' | null {
		return this.userClearReason;
	}

	/**
	 * Load user from storage
	 */
	loadUserFromStorage(): void {
		const storedUser = this.storage.load<User>('currentUser');
		if (storedUser) {
			this.currentUser = storedUser;
		}
	}

	/**
	 * Check if there's a stored session
	 */
	hasStoredSession(): boolean {
		const storedSession = this.storage.load<SessionInfo>('sessionInfo');
		return storedSession !== null;
	}

	/**
	 * Reconnect to stored session
	 */
	async reconnectStoredSession(): Promise<void> {
		try {
			const storedSession = this.storage.load<SessionInfo>('sessionInfo');
			if (!storedSession?.sessionId) {
				throw new Error('No stored session found');
			}

			// Try to rejoin the session
			await useWRPC().joinSession.mutation({ sessionId: storedSession.sessionId });

			// Fetch current session info
			this.sessionInfo = await useWRPC().getSessionInfo.query();

			// Fetch essential data
			const essentialData = await useWRPC().getEssentialData.query();
			this.handleEssentialDataUpdate(essentialData);

			// Load user from storage
			this.loadUserFromStorage();
		} catch (error) {
			// Clear invalid stored session
			this.clearSessionFromStorage();
			this.addErrorNotice(`Failed to reconnect to session: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Get current user
	 */
	getCurrentUser(): Readonly<User> | null {
		return this.currentUser ? $state.snapshot(this.currentUser) : null;
	}

	/**
	 * Check if a user is selected
	 */
	hasCurrentUser(): boolean {
		return this.currentUser !== null;
	}

	// ===== ERROR HANDLING METHODS =====

	/**
	 * Add error notice
	 */
	addErrorNotice(message: string): void {
		this.errorNotices = [...this.errorNotices, message];
	}

	/**
	 * Get all error notices
	 */
	getErrorNotices(): readonly string[] {
		return $state.snapshot(this.errorNotices);
	}

	/**
	 * Clear a specific error notice by index
	 */
	clearErrorNotice(index: number): void {
		if (index >= 0 && index < this.errorNotices.length) {
			this.errorNotices = this.errorNotices.filter((_, i) => i !== index);
		}
	}

	/**
	 * Clear all error notices
	 */
	clearAllErrorNotices(): void {
		this.errorNotices = [];
	}

	// ===== PRIVATE STORAGE METHODS =====

	/**
	 * Save user to storage
	 */
	private saveUserToStorage(user: User): void {
		if (user) {
			this.storage.save('currentUser', user);
		}
	}

	/**
	 * Clear user from storage
	 */
	private clearUserFromStorage(): void {
		this.storage.remove('currentUser');
	}

	/**
	 * Save essential data to storage
	 */
	private saveEssentialDataToStorage(): void {
		if (this.essentialData) {
			this.storage.save('essentialData', this.essentialData);
		}
	}

	/**
	 * Clear essential data from storage
	 */
	private clearEssentialDataFromStorage(): void {
		this.storage.remove('essentialData');
	}

	/**
	 * Save session info to storage
	 */
	private saveSessionToStorage(): void {
		if (this.sessionInfo) {
			this.storage.save('sessionInfo', this.sessionInfo);
		}
	}

	/**
	 * Clear session info from storage
	 */
	private clearSessionFromStorage(): void {
		this.storage.remove('sessionInfo');
	}
}
