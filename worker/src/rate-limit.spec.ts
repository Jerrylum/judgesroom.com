import { WRPCError } from '@jerrylum/wrpc/server';
import { describe, expect, it, vi } from 'vitest';
import { consumeWriteBudget, TOO_MANY_REQUESTS } from './rate-limit';

function limiter(success: boolean) {
	const limit = vi.fn(async () => ({ success }));
	return { limit, binding: { limit } as unknown as RateLimit };
}

describe('consumeWriteBudget', () => {
	it('allows the write and charges the room key', async () => {
		const { limit, binding } = limiter(true);

		await consumeWriteBudget(binding, 'room-1', 1);

		expect(limit).toHaveBeenCalledWith({ key: 'room-1', delta: 1 });
	});

	it('charges the requested weight', async () => {
		const { limit, binding } = limiter(true);

		await consumeWriteBudget(binding, 'room-1', 3);

		expect(limit).toHaveBeenCalledWith({ key: 'room-1', delta: 3 });
	});

	it('throws Too Many Requests when the limiter rejects', async () => {
		const { limit, binding } = limiter(false);

		await expect(consumeWriteBudget(binding, 'room-1', 1)).rejects.toBeInstanceOf(WRPCError);
		await expect(consumeWriteBudget(binding, 'room-1', 1)).rejects.toMatchObject({
			message: 'Too Many Requests',
			code: TOO_MANY_REQUESTS
		});
		expect(limit).toHaveBeenCalledTimes(2);
	});
});
