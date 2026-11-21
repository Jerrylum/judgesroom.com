import { WRPCError } from '@jerrylum/wrpc/server';

export const TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS';

/**
 * Charge `weight` units against the room write budget.
 * Call this before any SQLite insert, update, or delete.
 * A rejected check does not increment the counter.
 */
export async function consumeWriteBudget(limiter: RateLimit, roomId: string, weight: number): Promise<void> {
	const delta = Math.max(1, Math.floor(weight));
	// Weight 1 is the binding default. Omit delta so Wrangler 4.118 local dev does not need the weighted-request API.
	const options = delta === 1 ? { key: roomId } : ({ key: roomId, delta } as RateLimitOptions);
	const { success } = await limiter.limit(options);
	if (!success) {
		throw new WRPCError('Too Many Requests', TOO_MANY_REQUESTS);
	}
}
