import { WRPCError } from '@jerrylum/wrpc/server';

export const TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS';
export const TOO_MANY_READS = 'TOO_MANY_READS';

/**
 * Charge `weight` units against the room write budget.
 * Call this before any SQLite insert, update, or delete.
 * A rejected check does not increment the counter.
 */
export async function consumeWriteBudget(limiter: RateLimit, roomId: string, weight: number): Promise<void> {
	const delta = Math.max(1, Math.floor(weight));
	const { success } = await limiter.limit({ key: roomId, delta });
	if (!success) {
		throw new WRPCError('Too Many Requests', TOO_MANY_REQUESTS);
	}
}

/**
 * Charge `weight` units against the room read budget.
 * Call this on a wrpc read, before the select.
 * A rejected check does not increment the counter.
 */
export async function consumeReadBudget(limiter: RateLimit, roomId: string, weight: number): Promise<void> {
	const delta = Math.max(1, Math.floor(weight));
	const { success } = await limiter.limit({ key: roomId, delta });
	if (!success) {
		throw new WRPCError('Too Many Requests', TOO_MANY_READS);
	}
}
