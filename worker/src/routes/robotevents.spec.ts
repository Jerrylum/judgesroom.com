import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import type { AnyRouter, Session } from '@jerrylum/wrpc/server';
import type { RobotEventsCachePayload, RobotEventsCacheUpdate, RobotEventsResource } from '@judgesroom.com/protocol/src/robotevents-insight';
import { ROBOT_EVENTS_CACHE_FETCH_MS } from '@judgesroom.com/protocol/src/robotevents-insight';
import { serverRouter, type ServerContext } from '../server-router';
import { createTestServerContext, seedTestDatabase } from '../test-utils';
import { robotEventsCache, subscriptions } from '../db/schema';

const lists: RobotEventsCachePayload = {
	teams: [{ number: '123A', grade: 'Middle School' }],
	rankings: [{ teamNumber: '123A', divisionId: 1, rank: 1 }],
	skills: [{ teamNumber: '123A', rank: 1, driverScore: 10, programmingScore: 20, overallScore: 30 }]
};

describe('VEX Events cache', () => {
	let context: ServerContext & { cleanup: () => void };
	let updates: { clientId: string; update: RobotEventsCacheUpdate }[];

	function sessionFor(clientId: string): Session<AnyRouter> {
		return {
			getClient: (targetId: string) =>
				({
					onRobotEventsCache: {
						notify: (update: RobotEventsCacheUpdate) => {
							updates.push({ clientId: targetId, update });
						}
					}
				}) as never,
			broadcast: () => {
				throw new Error('unused');
			},
			getServer: () => {
				throw new Error('unused');
			},
			roomId: 'test-room',
			currentClient: { clientId, deviceId: clientId, deviceName: clientId }
		};
	}

	async function subscribe(clientId: string, resources: RobotEventsResource[], refresh: boolean) {
		return serverRouter.robotevents.subscribeRobotEventsCache._def._resolver!({
			input: { resources, refresh },
			session: sessionFor(clientId),
			ctx: context
		});
	}

	async function provide(
		clientId: string,
		input:
			| { state: 'RESULT'; fetchedAt: number; teams?: RobotEventsCachePayload['teams']; rankings?: RobotEventsCachePayload['rankings']; skills?: RobotEventsCachePayload['skills'] }
			| { state: 'FETCH_FAILED'; resources: RobotEventsResource[] }
	) {
		return serverRouter.robotevents.provideRobotEventsCache._def._resolver!({
			input,
			session: sessionFor(clientId),
			ctx: context
		});
	}

	async function unsubscribe(clientId: string, resources: RobotEventsResource[]) {
		return serverRouter.robotevents.unsubscribeRobotEventsCache._def._resolver!({
			input: { resources },
			session: sessionFor(clientId),
			ctx: context
		});
	}

	beforeEach(async () => {
		context = createTestServerContext();
		await seedTestDatabase(context);
		updates = [];
	});

	afterEach(() => {
		context.cleanup();
	});

	it('lets attendance fetch rankings, then shares that list with excellence', async () => {
		const missed = await subscribe('judge-a', ['rankings'], false);
		expect(missed).toEqual([{ resource: 'rankings', state: 'MISSED', requireRefetch: true }]);

		await provide('judge-a', { state: 'RESULT', fetchedAt: Date.now(), rankings: lists.rankings });

		updates = [];
		const shared = await subscribe('judge-b', ['teams', 'rankings', 'skills'], false);
		expect(shared.find((status) => status.resource === 'rankings')).toMatchObject({ state: 'HIT', requireRefetch: false });
		expect(shared.find((status) => status.resource === 'teams')).toMatchObject({ state: 'MISSED', requireRefetch: true });
		expect(shared.find((status) => status.resource === 'skills')).toMatchObject({ state: 'MISSED', requireRefetch: true });
		expect(updates.map((entry) => entry.update)).toEqual([
			expect.objectContaining({ state: 'FETCHING', resource: 'teams' }),
			expect.objectContaining({ state: 'FETCHING', resource: 'skills' })
		]);
	});

	it('makes a second rankings subscriber wait for the download in progress', async () => {
		await subscribe('judge-a', ['rankings'], false);
		updates = [];

		const waiting = await subscribe('judge-b', ['rankings'], false);
		expect(waiting).toEqual([{ resource: 'rankings', state: 'MISSED', requireRefetch: false }]);
		expect(updates).toEqual([]);
	});

	it('unsubscribes multiple resources in one call', async () => {
		await subscribe('judge-a', ['teams', 'rankings', 'skills'], false);
		await unsubscribe('judge-a', ['teams', 'skills']);

		const remaining = await context.db.select().from(subscriptions).where(eq(subscriptions.id, 'judge-a'));
		expect(remaining.map((row) => row.topic)).toEqual(['robotEventsCache:rankings']);
	});

	it('refetches a fresh rankings list when refresh is requested', async () => {
		await context.db.insert(robotEventsCache).values({
			resource: 'rankings',
			payload: lists.rankings,
			fetchedAt: Date.now(),
			fetchingStarted: 0
		});

		const refreshed = await subscribe('judge-a', ['rankings'], true);
		expect(refreshed[0]).toMatchObject({ resource: 'rankings', state: 'HIT', requireRefetch: true });
		expect(updates).toEqual([{ clientId: 'judge-a', update: expect.objectContaining({ state: 'FETCHING', resource: 'rankings' }) }]);
	});

	it('does not start a second rankings download while one is in progress', async () => {
		await context.db.insert(robotEventsCache).values({
			resource: 'rankings',
			payload: lists.rankings,
			fetchedAt: Date.now(),
			fetchingStarted: Date.now()
		});

		const waiting = await subscribe('judge-a', ['rankings'], true);
		expect(waiting[0]).toMatchObject({ requireRefetch: false, state: 'HIT' });
		expect(updates).toEqual([]);
	});

	it('lets the next subscriber fetch a resource after the lease expires', async () => {
		await context.db.insert(robotEventsCache).values({
			resource: 'rankings',
			payload: null,
			fetchedAt: null,
			fetchingStarted: Date.now() - ROBOT_EVENTS_CACHE_FETCH_MS - 1_000
		});

		const again = await subscribe('judge-b', ['rankings'], false);
		expect(again[0]).toMatchObject({ state: 'MISSED', requireRefetch: true });
	});

	it('broadcasts a rankings result and ignores an older copy', async () => {
		await subscribe('judge-a', ['rankings'], false);
		await subscribe('judge-b', ['rankings'], false);
		updates = [];

		await provide('judge-a', { state: 'RESULT', fetchedAt: 5_000, rankings: lists.rankings });
		expect(updates.map((entry) => entry.clientId).sort()).toEqual(['judge-a', 'judge-b']);

		updates = [];
		await provide('judge-a', { state: 'RESULT', fetchedAt: 1_000, rankings: lists.rankings });
		expect(updates).toEqual([]);

		const row = await context.db.select().from(robotEventsCache).where(eq(robotEventsCache.resource, 'rankings'));
		expect(row[0].fetchedAt).toBe(5_000);
	});

	it('clears only the failed resource lease', async () => {
		await subscribe('judge-a', ['rankings', 'skills'], false);
		updates = [];

		await provide('judge-a', { state: 'FETCH_FAILED', resources: ['rankings'] });
		expect(updates).toEqual([{ clientId: 'judge-a', update: { state: 'FETCH_FAILED', resource: 'rankings' } }]);

		const rankings = await context.db.select().from(robotEventsCache).where(eq(robotEventsCache.resource, 'rankings'));
		const skills = await context.db.select().from(robotEventsCache).where(eq(robotEventsCache.resource, 'skills'));
		expect(rankings[0].fetchingStarted).toBe(0);
		expect(skills[0].fetchingStarted).not.toBe(0);
	});
});
