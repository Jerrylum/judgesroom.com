import { eq, and } from 'drizzle-orm';
import { subscriptions } from '../db/schema';
import type { DatabaseOrTransaction } from '../server-router';
import type { RouterProxy } from '@judging.jerryio/wrpc/server';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { transaction } from '../utils';

export type ClientSource = { getClient: (clientId: string) => RouterProxy<ClientRouter> };

export async function subscribeTopic(db: DatabaseOrTransaction, clientId: string, topic: string) {
	await db.insert(subscriptions).values({ id: clientId, topic }).onConflictDoNothing();
}

export async function subscribeJudgeGroupTopic(
	db: DatabaseOrTransaction,
	clientId: string,
	judgeGroupIds: string[],
	topic: string,
	exclusive: boolean
) {
	await transaction(db, async (tx) => {
		if (exclusive) {
			await unsubscribeTopic(tx, clientId, topic);
		}
		for (const judgeGroupId of judgeGroupIds) {
			await tx.insert(subscriptions).values({ id: clientId, judgeGroupId, topic }).onConflictDoNothing();
		}
	});
}

export async function unsubscribeTopic(db: DatabaseOrTransaction, clientId: string, topic: string) {
	await db.delete(subscriptions).where(and(eq(subscriptions.id, clientId), eq(subscriptions.topic, topic)));
}

export async function unsubscribeTopics(db: DatabaseOrTransaction, clientId: string) {
	await db.delete(subscriptions).where(eq(subscriptions.id, clientId));
}

export async function broadcastJudgeGroupTopic<T>(
	db: DatabaseOrTransaction,
	judgeGroupId: string,
	topic: string,
	source: ClientSource,
	callback: (client: RouterProxy<ClientRouter>) => Promise<T>
): Promise<T[]> {
	const subscribers = await db
		.select()
		.from(subscriptions)
		.where(and(eq(subscriptions.judgeGroupId, judgeGroupId), eq(subscriptions.topic, topic)));

	return Promise.all(
		subscribers.map(async (subscriber) => {
			return callback(source.getClient(subscriber.id));
		})
	);
}

export async function broadcastTopic<T>(
	db: DatabaseOrTransaction,
	topic: string,
	source: ClientSource,
	callback: (client: RouterProxy<ClientRouter>) => Promise<T>
): Promise<T[]> {
	const subscribers = await db.select().from(subscriptions).where(eq(subscriptions.topic, topic));

	return Promise.all(
		subscribers.map(async (subscriber) => {
			return callback(source.getClient(subscriber.id));
		})
	);
}
