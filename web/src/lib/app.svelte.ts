import type { Judge, JudgeGroup } from '@judging.jerryio/protocol/src/judging';
import type { User } from './user.svelte';
import { getWRPCConnectionState, useWRPC } from './use-wrpc';
import type { ConnectionState } from '@judging.jerryio/wrpc/client';
import type { ClientInfo, SessionInfo } from '@judging.jerryio/protocol/src/client';
import type { EventGradeLevel } from './event.svelte';

export class AppStorage {
	/**
	 * Save data to localStorage with the given key
	 * @param key - The storage key
	 * @param data - The data to save (must be JSON serializable)
	 */
	save(
		key: string,
		data: Record<string, unknown> | unknown[] | string | number | boolean | null
	): void {
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

  private allJudges: readonly Judge[] = $state([]);
  private allJudgeGroups: readonly JudgeGroup[] = $state([]);

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

  getJudgeGroups(): Readonly<JudgeGroup[]> {
    return $state.snapshot(this.allJudgeGroups);
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

  getClients(): readonly ClientInfo[] {
    throw new Error('Not implemented');
  }

  getSessionInfo(): Readonly<SessionInfo> | null {
    throw new Error('Not implemented');
  }

  getSessionUrl(): string {
    throw new Error('Not implemented');
  }

  createSession(): Promise<void> {
    throw new Error('Not implemented');
  }

  getTeamCount(): number {
    throw new Error('Not implemented');
  }

  getJudgeGroupCount(): number {
    throw new Error('Not implemented');
  }

  getJudgeCount(): number {
    throw new Error('Not implemented');
  }

  isInSession(): boolean {
    throw new Error('Not implemented');
  }

  leaveSession(): Promise<void> {
    throw new Error('Not implemented');
  }

  destroySessionData(): void {
    throw new Error('Not implemented');
  }

  loadUserFromStorage(): void {
    throw new Error('Not implemented');
  }

  hasStoredSession(): boolean {
    throw new Error('Not implemented');
  }


  reconnectStoredSession(): Promise<void> {
    throw new Error('Not implemented');
  }

  clearErrorNotice(index: number): void {
    throw new Error('Not implemented');
  }

  getErrorNotices(): readonly string[] {
    throw new Error('Not implemented');
  }

  getEventName(): string | null {
    throw new Error('Not implemented');
  }

  getEventGradeLevel(): EventGradeLevel | null {
    throw new Error('Not implemented');
  }

  getCurrentUserJudgeGroup(judgeId: string): Readonly<JudgeGroup> | null {
    throw new Error('Not implemented');
  }

	/**
	 * Get current user
	 */
	getCurrentUser(): Readonly<User> | null {
		return this.currentUser ? $state.snapshot(this.currentUser) : null;
	}

  getUserClearReason(): 'role_deleted' | null {
    throw new Error('Not implemented');
  }

  kickClient(clientId: string): Promise<void> {
    throw new Error('Not implemented');
  }

	/**
	 * Check if a user is selected
	 */
	hasCurrentUser(): boolean {
		return this.currentUser !== null;
	}

  hasEssentialData(): boolean {
    throw new Error('Not implemented');
  }

  joinSessionFromUrl(url: string): Promise<void> {
    throw new Error('Not implemented');
  }

	private saveUserToStorage(user: User): void {
		if (user) {
			this.storage.save('currentUser', user);
		}
	}

	private clearUserFromStorage(): void {
		this.storage.remove('currentUser');
	}

}
