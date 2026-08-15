import type { ConnectionState } from '@jerrylum/wrpc/client';

/**
 * wrpc auto-reconnect is reconnecting → connected on the same client instance.
 * First join/create is connecting → connected and must not resume (join is already in flight).
 */
export function shouldResumeJudgesRoom(previous: ConnectionState, next: ConnectionState, roomJoined: boolean): boolean {
	return previous === 'reconnecting' && next === 'connected' && roomJoined;
}
