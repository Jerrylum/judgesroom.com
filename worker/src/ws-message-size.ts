/** Inbound wrpc frames larger than this are dropped before JSON.parse (S5-1). */
export const MAX_INCOMING_WRPC_MESSAGE_BYTES = 1024 * 1024;

/** Cheap size: UTF-16 length for strings (JSON is ASCII-heavy); byteLength for ArrayBuffer. */
export function incomingWebSocketMessageSize(message: string | ArrayBuffer): number {
	return typeof message === 'string' ? message.length : message.byteLength;
}

export function isIncomingWebSocketMessageTooLarge(message: string | ArrayBuffer): boolean {
	return incomingWebSocketMessageSize(message) > MAX_INCOMING_WRPC_MESSAGE_BYTES;
}

/** Small wrpc error so the client sees a rejection without parsing the inbound frame. */
export const incomingMessageTooLargeResponse = JSON.stringify({
	kind: 'response',
	id: 'unknown',
	result: {
		type: 'error',
		error: {
			message: 'Message too large',
			code: 'PAYLOAD_TOO_LARGE'
		}
	}
});
