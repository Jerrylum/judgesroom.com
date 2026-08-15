import { describe, it, expect } from 'vitest';
import { EMPTY_ROOM_TTL_MS, IDLE_ROOM_TTL_MS, retentionDecision } from './retention';

describe('room retention', () => {
	const now = Date.UTC(2026, 7, 15, 7, 0, 0);

	it('uses a 1 hour first checkpoint and a 90 day idle window', () => {
		expect(EMPTY_ROOM_TTL_MS).toBe(60 * 60 * 1000);
		expect(IDLE_ROOM_TTL_MS).toBe(90 * 24 * 60 * 60 * 1000);
	});

	it('destroys empty objects with no metadata', () => {
		expect(retentionDecision(now, false, null)).toEqual({ action: 'destroy' });
	});

	it('adopts a v2.0.0 room whose updatedAt is still null', () => {
		expect(retentionDecision(now, true, null)).toEqual({
			action: 'adopt',
			alarmAt: now + IDLE_ROOM_TTL_MS
		});
	});

	it('destroys a live room 90 days after last event setup', () => {
		expect(retentionDecision(now + IDLE_ROOM_TTL_MS - 1, true, now)).toEqual({
			action: 'reschedule',
			alarmAt: now + IDLE_ROOM_TTL_MS
		});
		expect(retentionDecision(now + IDLE_ROOM_TTL_MS, true, now)).toEqual({ action: 'destroy' });
	});
});
