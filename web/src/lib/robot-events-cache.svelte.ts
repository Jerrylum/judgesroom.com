import {
	ATTENDANCE_ROBOT_EVENTS_RESOURCES,
	EXCELLENCE_ROBOT_EVENTS_RESOURCES,
	ROBOT_EVENTS_CACHE_FETCH_MS,
	parseRobotEventsResourcePayload,
	type RobotEventsCachePayload,
	type RobotEventsCacheUpdate,
	type RobotEventsResource
} from '@judgesroom.com/protocol/src/robotevents-insight';
import { downloadRobotEventsResources, getRobotEventsClient } from './robotevents-source';
import { app } from './index.svelte';

export type InsightSyncStatus = 'fetched' | 'cached' | 'waiting' | 'failed';

type Slot<T> = {
	payload: T | null;
	fetchedAt: number;
	fetchingStarted: number;
	phase: 'idle' | 'fetching' | 'failed';
};

function blank<T>(): Slot<T> {
	return { payload: null, fetchedAt: 0, fetchingStarted: 0, phase: 'idle' };
}

class RobotEventsCacheStore {
	teams = $state<Slot<RobotEventsCachePayload['teams']>>(blank());
	rankings = $state<Slot<RobotEventsCachePayload['rankings']>>(blank());
	skills = $state<Slot<RobotEventsCachePayload['skills']>>(blank());
	lastError = $state('');

	private holders: Record<RobotEventsResource, number> = { teams: 0, rankings: 0, skills: 0 };
	private eventId: number | null = null;
	private divisionId: number | null = null;
	private wanted = new Set<RobotEventsResource>();
	private fetchPromise: Promise<boolean> | null = null;
	private expiryTimers: Partial<Record<RobotEventsResource, ReturnType<typeof setTimeout>>> = {};

	get excellencePayload(): RobotEventsCachePayload | null {
		if (!this.teams.payload || !this.rankings.payload || !this.skills.payload) return null;
		return { teams: this.teams.payload, rankings: this.rankings.payload, skills: this.skills.payload };
	}

	isFetching(resources: readonly RobotEventsResource[]): boolean {
		return resources.some((resource) => this.read(resource).phase === 'fetching');
	}

	applyUpdate(update: RobotEventsCacheUpdate): void {
		const current = this.read(update.resource);
		if (update.state === 'FETCHING') {
			const parsed = update.payload === undefined ? null : parseRobotEventsResourcePayload(update.resource, update.payload);
			this.write(update.resource, {
				payload: parsed?.success ? parsed.data : current.payload,
				fetchedAt: update.fetchedAt ?? current.fetchedAt,
				fetchingStarted: update.fetchingStarted,
				phase: 'fetching'
			});
			this.armExpiry(update.resource, update.fetchingStarted);
			return;
		}

		if (update.state === 'RESULT') {
			const parsed = parseRobotEventsResourcePayload(update.resource, update.payload);
			if (!parsed.success) return;
			this.write(update.resource, {
				payload: parsed.data,
				fetchedAt: update.fetchedAt,
				fetchingStarted: 0,
				phase: 'idle'
			});
			this.clearExpiry(update.resource);
			return;
		}

		this.write(update.resource, { ...current, fetchingStarted: 0, phase: 'failed' });
		this.clearExpiry(update.resource);
	}

	async retain(eventId: number, divisionId: number, resources: readonly RobotEventsResource[]): Promise<InsightSyncStatus> {
		this.rememberEvent(eventId, divisionId);
		for (const resource of resources) this.holders[resource] += 1;
		return this.sync(resources, false);
	}

	release(resources: readonly RobotEventsResource[]): void {
		const released: RobotEventsResource[] = [];
		for (const resource of resources) {
			this.holders[resource] = Math.max(0, this.holders[resource] - 1);
			if (this.holders[resource] === 0) released.push(resource);
		}
		if (released.length > 0) {
			app.wrpcClient.robotevents.unsubscribeRobotEventsCache.notify({ resources: released });
		}
	}

	async refresh(resources: readonly RobotEventsResource[]): Promise<InsightSyncStatus> {
		if (this.eventId == null || this.divisionId == null) return 'failed';
		return this.sync(resources, true);
	}

	private rememberEvent(eventId: number, divisionId: number): void {
		if (this.eventId === eventId && this.divisionId === divisionId) return;
		this.eventId = eventId;
		this.divisionId = divisionId;
		this.teams = blank();
		this.rankings = blank();
		this.skills = blank();
	}

	private async sync(resources: readonly RobotEventsResource[], refresh: boolean): Promise<InsightSyncStatus> {
		const result = await app.wrpcClient.robotevents.subscribeRobotEventsCache.mutation({
			resources: [...resources],
			refresh
		});
		for (const status of result) this.applyStatus(status);

		const needed = result.filter((status) => status.requireRefetch).map((status) => status.resource);
		if (needed.length > 0) {
			const downloaded = await this.fetchResources(needed);
			if (!downloaded) return 'failed';
			return 'fetched';
		}

		if (resources.some((resource) => this.read(resource).phase === 'fetching')) return 'waiting';
		if (resources.some((resource) => this.read(resource).phase === 'failed')) return 'failed';
		return 'cached';
	}

	private applyStatus(status: {
		resource: RobotEventsResource;
		state: 'HIT' | 'MISSED';
		payload?: unknown;
		fetchedAt?: number;
		fetchingStarted?: number;
		requireRefetch: boolean;
	}): void {
		const current = this.read(status.resource);
		const fetching = status.requireRefetch || (status.fetchingStarted ?? 0) > 0;
		if (status.state === 'HIT' && status.payload !== undefined && status.fetchedAt !== undefined) {
			const parsed = parseRobotEventsResourcePayload(status.resource, status.payload);
			if (parsed.success) {
				this.write(status.resource, {
					payload: parsed.data,
					fetchedAt: status.fetchedAt,
					fetchingStarted: status.fetchingStarted ?? 0,
					phase: fetching ? 'fetching' : 'idle'
				});
			}
		} else if (fetching) {
			this.write(status.resource, {
				...current,
				fetchingStarted: status.fetchingStarted ?? Date.now(),
				phase: 'fetching'
			});
		}

		const started = this.read(status.resource).fetchingStarted;
		if (started > 0) this.armExpiry(status.resource, started);
		else this.clearExpiry(status.resource);
	}

	private async fetchResources(resources: RobotEventsResource[]): Promise<boolean> {
		for (const resource of resources) this.wanted.add(resource);
		if (this.fetchPromise) return this.fetchPromise;
		this.fetchPromise = this.drain().finally(() => {
			this.fetchPromise = null;
		});
		return this.fetchPromise;
	}

	private async drain(): Promise<boolean> {
		const batch = [...this.wanted];
		this.wanted.clear();
		const downloaded = await this.download(batch);
		if (this.wanted.size === 0) return downloaded;
		return (await this.drain()) && downloaded;
	}

	private async download(resources: RobotEventsResource[]): Promise<boolean> {
		if (this.eventId == null || this.divisionId == null) return false;
		const order = (['teams', 'rankings', 'skills'] as const).filter((resource) => resources.includes(resource));
		const fetched: Partial<RobotEventsCachePayload> = {};
		const failed: RobotEventsResource[] = [];

		for (let index = 0; index < order.length; index += 1) {
			const resource = order[index];
			try {
				const part = await downloadRobotEventsResources(getRobotEventsClient(), this.eventId, this.divisionId, [resource]);
				if (resource === 'teams') {
					if (!part.teams) throw new Error('Missing teams');
					fetched.teams = part.teams;
				} else if (resource === 'rankings') {
					if (!part.rankings) throw new Error('Missing rankings');
					fetched.rankings = part.rankings;
				} else {
					if (!part.skills) throw new Error('Missing skills');
					fetched.skills = part.skills;
				}
			} catch (error) {
				this.lastError = error instanceof Error ? error.message : 'Unknown error';
				console.error('Failed to get event from RobotEvents', error);
				failed.push(...order.slice(index));
				break;
			}
		}

		try {
			const robotevents = app.wrpcClient.robotevents;
			if (fetched.teams || fetched.rankings || fetched.skills) {
				const fetchedAt = Date.now();
				await robotevents.provideRobotEventsCache.mutation({ state: 'RESULT', fetchedAt, ...fetched });
				if (fetched.teams) {
					this.write('teams', { payload: fetched.teams, fetchedAt, fetchingStarted: 0, phase: 'idle' });
					this.clearExpiry('teams');
				}
				if (fetched.rankings) {
					this.write('rankings', { payload: fetched.rankings, fetchedAt, fetchingStarted: 0, phase: 'idle' });
					this.clearExpiry('rankings');
				}
				if (fetched.skills) {
					this.write('skills', { payload: fetched.skills, fetchedAt, fetchingStarted: 0, phase: 'idle' });
					this.clearExpiry('skills');
				}
			}
			if (failed.length > 0) {
				await robotevents.provideRobotEventsCache.mutation({ state: 'FETCH_FAILED', resources: failed });
				for (const resource of failed) {
					const current = this.read(resource);
					this.write(resource, { ...current, fetchingStarted: 0, phase: 'failed' });
					this.clearExpiry(resource);
				}
			}
		} catch (error) {
			console.error('Failed to report VEX Events fetch', error);
			return false;
		}

		return failed.length === 0;
	}

	private read(resource: RobotEventsResource): Slot<RobotEventsCachePayload[RobotEventsResource]> {
		return this[resource];
	}

	private write(resource: RobotEventsResource, slot: Slot<RobotEventsCachePayload[RobotEventsResource]>): void {
		if (resource === 'teams') this.teams = slot as Slot<RobotEventsCachePayload['teams']>;
		else if (resource === 'rankings') this.rankings = slot as Slot<RobotEventsCachePayload['rankings']>;
		else this.skills = slot as Slot<RobotEventsCachePayload['skills']>;
	}

	private armExpiry(resource: RobotEventsResource, started: number): void {
		this.clearExpiry(resource);
		const remaining = Math.max(0, ROBOT_EVENTS_CACHE_FETCH_MS - (Date.now() - started));
		this.expiryTimers[resource] = setTimeout(() => {
			if (this.read(resource).fetchingStarted !== started) return;
			const current = this.read(resource);
			this.write(resource, { ...current, fetchingStarted: 0, phase: current.phase === 'fetching' ? 'idle' : current.phase });
		}, remaining);
	}

	private clearExpiry(resource: RobotEventsResource): void {
		const timer = this.expiryTimers[resource];
		if (timer !== undefined) clearTimeout(timer);
		delete this.expiryTimers[resource];
	}
}

export const robotEventsCache = new RobotEventsCacheStore();

export { ATTENDANCE_ROBOT_EVENTS_RESOURCES, EXCELLENCE_ROBOT_EVENTS_RESOURCES };
