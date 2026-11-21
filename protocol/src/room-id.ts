import { z } from 'zod';
import { generateAlphabetToken } from './access';

/** New rooms use this length. Existing UUID v4 room ids remain valid. */
export const ROOM_ID_LENGTH = 18;

/** Close reason during room creation when the turnstile verification fails. */
export const TurnstileVerificationFailedCloseReason = 'Turnstile verification failed';

/**
 * Close reason for the socket that called leaveJudgesRoom.
 * Other sockets of that device are still closed as a normal kick.
 */
export const LeftJudgesRoomCloseReason = "Left the Judges' Room";

/** Accept-then-close reason when a socket names a room that was never created. */
export const RoomNotFoundCloseReason = "Judges' Room not found";

/**
 * Close reason for the socket that failed to connect to the WebSocket server.
 */
export const WebSocketConnectionFailedCloseReason = 'WebSocket connection failed';

const ShortRoomIdSchema = z
	.string()
	.length(ROOM_ID_LENGTH)
	.regex(/^[a-zA-Z0-9_-]+$/, { message: 'Room id must be alphanumeric, hyphen, or underscore' });

/** Client-minted room capability: new 18-char tokens, or UUID v4 for rooms created before the short form. */
export const RoomIdSchema = z.union([z.uuidv4(), ShortRoomIdSchema]);

export type RoomId = z.infer<typeof RoomIdSchema>;

export function generateRoomId(): RoomId {
	return generateAlphabetToken(ROOM_ID_LENGTH) as RoomId;
}
