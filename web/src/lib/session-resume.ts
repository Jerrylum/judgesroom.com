import type { ConnectionState } from '@jerrylum/wrpc/client';

/**
 * wrpc reconnect is reconnecting → connecting → connected, not a single hop.
 * Remember the reconnect so connecting → connected can resume.
 * First join/create never enters reconnecting, so they must not resume.
 */
export function connectionResumeStep(next: ConnectionState, roomJoined: boolean, reconnectPending: boolean): {
	resume: boolean;
	reconnectPending: boolean;
} {
	if (next === 'reconnecting') {
		return { resume: false, reconnectPending: true };
	}
	if (next === 'offline' || next === 'error') {
		return { resume: false, reconnectPending: false };
	}
	if (next === 'connected') {
		return { resume: reconnectPending && roomJoined, reconnectPending: false };
	}
	return { resume: false, reconnectPending };
}
