import type { WRPCRootObject } from '@jerrylum/wrpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import {
	ROBOT_EVENTS_CACHE_FETCH_MS,
	ROBOT_EVENTS_CACHE_FRESH_MS,
	parseRobotEventsResourcePayload,
	ProvideRobotEventsCacheInputSchema,
	robotEventsCacheTopic,
	SubscribeRobotEventsCacheInputSchema,
	SubscribeRobotEventsCacheResultSchema,
	UnsubscribeRobotEventsCacheInputSchema,
	type ProvideRobotEventsCacheInput,
	type RobotEventsCacheUpdate,
	type RobotEventsRanking,
	type RobotEventsResource,
	type RobotEventsResourceStatus,
	type RobotEventsSkills,
	type RobotEventsTeam
} from '@judgesroom.com/protocol/src/robotevents-insight';
import { robotEventsCache, subscriptions as subscriptionRows } from '../db/schema';
import type { ServerContext, DatabaseOrTransaction } from '../server-router';
import { transaction } from '../utils';
import { broadcastTopic, subscribeTopic, type ClientSource } from './subscriptions';

type CacheRow = typeof robotEventsCache.$inferSelect;

function storedResource(row: CacheRow | undefined, resource: RobotEventsResource): { payload: unknown; fetchedAt: number } | null {
	if (!row || row.fetchedAt == null || row.payload == null) return null;
	const parsed = parseRobotEventsResourcePayload(resource, row.payload);
	if (!parsed.success) return null;
	return { payload: parsed.data, fetchedAt: row.fetchedAt };
}

function fetchingStartedAt(row: CacheRow | undefined, now: number): number {
	if (!row || row.fetchingStarted === 0 || now - row.fetchingStarted >= ROBOT_EVENTS_CACHE_FETCH_MS) return 0;
	return row.fetchingStarted;
}

async function readResource(db: DatabaseOrTransaction, resource: RobotEventsResource): Promise<CacheRow | undefined> {
	const rows = await db.select().from(robotEventsCache).where(eq(robotEventsCache.resource, resource));
	return rows[0];
}

export async function subscribeRobotEventsCache(
	db: DatabaseOrTransaction,
	clientId: string,
	resources: RobotEventsResource[],
	refresh: boolean,
	now = Date.now()
): Promise<{ result: RobotEventsResourceStatus[]; updates: RobotEventsCacheUpdate[] }> {
	return transaction(db, async (tx) => {
		const result: RobotEventsResourceStatus[] = [];
		const updates: RobotEventsCacheUpdate[] = [];

		for (const resource of resources) {
			const topic = robotEventsCacheTopic(resource);
			await tx.delete(subscriptionRows).where(and(eq(subscriptionRows.id, clientId), eq(subscriptionRows.topic, topic)));
			await subscribeTopic(tx, clientId, topic);

			const row = await readResource(tx, resource);
			const stored = storedResource(row, resource);
			const inProgress = fetchingStartedAt(row, now);
			const stale = stored == null || now - stored.fetchedAt >= ROBOT_EVENTS_CACHE_FRESH_MS;
			const requireRefetch = inProgress === 0 && (refresh || stale);
			let fetchingStarted = inProgress;

			if (requireRefetch) {
				fetchingStarted = now;
				if (row) {
					await tx.update(robotEventsCache).set({ fetchingStarted: now }).where(eq(robotEventsCache.resource, resource));
				} else {
					await tx.insert(robotEventsCache).values({
						resource,
						payload: null,
						fetchedAt: null,
						fetchingStarted: now
					});
				}
				updates.push(
					stored
						? { state: 'FETCHING', resource, fetchingStarted: now, payload: stored.payload, fetchedAt: stored.fetchedAt }
						: { state: 'FETCHING', resource, fetchingStarted: now }
				);
			}

			result.push(
				stored
					? { resource, state: 'HIT', payload: stored.payload, fetchedAt: stored.fetchedAt, fetchingStarted, requireRefetch }
					: { resource, state: 'MISSED', requireRefetch }
			);
		}

		return { result, updates };
	});
}

export async function provideRobotEventsCache(
	db: DatabaseOrTransaction,
	input: ProvideRobotEventsCacheInput
): Promise<RobotEventsCacheUpdate[]> {
	return transaction(db, async (tx) => {
		if (input.state === 'FETCH_FAILED') {
			for (const resource of input.resources) {
				await tx.update(robotEventsCache).set({ fetchingStarted: 0 }).where(eq(robotEventsCache.resource, resource));
			}
			return input.resources.map((resource) => ({ state: 'FETCH_FAILED' as const, resource }));
		}

		const updates: RobotEventsCacheUpdate[] = [];
		const entries: Array<['teams', RobotEventsTeam[]] | ['rankings', RobotEventsRanking[]] | ['skills', RobotEventsSkills[]]> = [];
		if (input.teams) entries.push(['teams', input.teams]);
		if (input.rankings) entries.push(['rankings', input.rankings]);
		if (input.skills) entries.push(['skills', input.skills]);

		for (const [resource, payload] of entries) {
			const row = await readResource(tx, resource);
			const stored = storedResource(row, resource);
			if (stored && input.fetchedAt < stored.fetchedAt) continue;

			const values = { payload, fetchedAt: input.fetchedAt, fetchingStarted: 0 };
			if (row) {
				await tx.update(robotEventsCache).set(values).where(eq(robotEventsCache.resource, resource));
			} else {
				await tx.insert(robotEventsCache).values({ resource, ...values });
			}
			updates.push({ state: 'RESULT', resource, payload, fetchedAt: input.fetchedAt });
		}

		return updates;
	});
}

function broadcastUpdate(db: DatabaseOrTransaction, source: ClientSource, update: RobotEventsCacheUpdate) {
	return broadcastTopic(db, robotEventsCacheTopic(update.resource), source, (client) => {
		client.onRobotEventsCache.notify(update);
	});
}

export function buildRobotEventsRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		subscribeRobotEventsCache: w.procedure
			.input(SubscribeRobotEventsCacheInputSchema)
			.output(SubscribeRobotEventsCacheResultSchema)
			.mutation(async ({ ctx, input, session }) => {
				const { result, updates } = await subscribeRobotEventsCache(
					ctx.db,
					session.currentClient.clientId,
					input.resources,
					input.refresh
				);
				for (const update of updates) await broadcastUpdate(ctx.db, session, update);
				return result;
			}),

		unsubscribeRobotEventsCache: w.procedure.input(UnsubscribeRobotEventsCacheInputSchema).notify(async ({ ctx, input, session }) => {
			const topics = [...new Set(input.resources)].map(robotEventsCacheTopic);
			await ctx.db
				.delete(subscriptionRows)
				.where(and(eq(subscriptionRows.id, session.currentClient.clientId), inArray(subscriptionRows.topic, topics)));
		}),

		provideRobotEventsCache: w.procedure.input(ProvideRobotEventsCacheInputSchema).mutation(async ({ ctx, input, session }) => {
			const updates = await provideRobotEventsCache(ctx.db, input);
			for (const update of updates) await broadcastUpdate(ctx.db, session, update);
		})
	};
}
