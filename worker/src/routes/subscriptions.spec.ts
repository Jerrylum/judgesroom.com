import { describe, expect, it } from 'vitest';
import { shouldClearTopicsOnSocketClose } from './subscriptions';

describe('shouldClearTopicsOnSocketClose', () => {
	it('clears topics when the closing socket is the only one tagged with that clientId', () => {
		const closing = {} as WebSocket;
		expect(shouldClearTopicsOnSocketClose([closing], closing)).toBe(true);
		expect(shouldClearTopicsOnSocketClose([], closing)).toBe(true);
	});

	it('keeps topics when another socket still holds the same clientId', () => {
		const closing = {} as WebSocket;
		const replacement = {} as WebSocket;
		expect(shouldClearTopicsOnSocketClose([closing, replacement], closing)).toBe(false);
		expect(shouldClearTopicsOnSocketClose([replacement], closing)).toBe(false);
	});
});
