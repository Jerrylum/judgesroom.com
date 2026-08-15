import { describe, it, expect } from 'vitest';
import {
	MAX_INCOMING_WRPC_MESSAGE_BYTES,
	incomingMessageTooLargeResponse,
	incomingWebSocketMessageSize,
	isIncomingWebSocketMessageTooLarge
} from './ws-message-size';

describe('incoming WebSocket message size', () => {
	it('caps inbound wrpc frames at 1 MiB', () => {
		expect(MAX_INCOMING_WRPC_MESSAGE_BYTES).toBe(1024 * 1024);
	});

	it('uses string length and ArrayBuffer byteLength without decoding', () => {
		expect(incomingWebSocketMessageSize('{"kind":"ping"}')).toBe(15);
		expect(incomingWebSocketMessageSize(new ArrayBuffer(64))).toBe(64);
	});

	it('allows a 1 MiB frame and rejects one extra unit', () => {
		expect(isIncomingWebSocketMessageTooLarge('x'.repeat(MAX_INCOMING_WRPC_MESSAGE_BYTES))).toBe(false);
		expect(isIncomingWebSocketMessageTooLarge('x'.repeat(MAX_INCOMING_WRPC_MESSAGE_BYTES + 1))).toBe(true);
		expect(isIncomingWebSocketMessageTooLarge(new ArrayBuffer(MAX_INCOMING_WRPC_MESSAGE_BYTES))).toBe(false);
		expect(isIncomingWebSocketMessageTooLarge(new ArrayBuffer(MAX_INCOMING_WRPC_MESSAGE_BYTES + 1))).toBe(true);
	});

	it('rejects with a small wrpc error payload', () => {
		const parsed = JSON.parse(incomingMessageTooLargeResponse);
		expect(parsed).toEqual({
			kind: 'response',
			id: 'unknown',
			result: {
				type: 'error',
				error: { message: 'Message too large', code: 'PAYLOAD_TOO_LARGE' }
			}
		});
		expect(incomingMessageTooLargeResponse.length).toBeLessThan(256);
	});
});
