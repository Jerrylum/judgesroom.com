/** First checkpoint after a Durable Object is created (empty-probe delete). */
export const EMPTY_ROOM_TTL_MS = 60 * 60 * 1000;

/** Live rooms are deleted this long after the last event-setup save (metadata.updatedAt). */
export const IDLE_ROOM_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type RetentionDecision =
	| { action: 'destroy' }
	| { action: 'reschedule'; alarmAt: number }
	| { action: 'adopt'; alarmAt: number };

/**
 * No metadata → empty probe, destroy.
 * Null updatedAt → v2.0.0 room; stamp now and start a 90-day clock (must persist or the next alarm slides forever).
 * Else destroy or reschedule from that stamp.
 */
export function retentionDecision(nowMs: number, hasMetadata: boolean, updatedAtMs: number | null): RetentionDecision {
	if (!hasMetadata) {
		return { action: 'destroy' };
	}
	if (updatedAtMs === null) {
		return { action: 'adopt', alarmAt: nowMs + IDLE_ROOM_TTL_MS };
	}
	if (nowMs - updatedAtMs >= IDLE_ROOM_TTL_MS) {
		return { action: 'destroy' };
	}
	return { action: 'reschedule', alarmAt: updatedAtMs + IDLE_ROOM_TTL_MS };
}
