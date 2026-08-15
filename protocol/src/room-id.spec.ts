import { describe, expect, it } from 'vitest';
import { AUTH_TOKEN_ALPHABET, AUTH_TOKEN_LENGTH, generateAuthToken } from './access';
import { ROOM_ID_LENGTH, RoomIdSchema, generateRoomId } from './room-id';

const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000';

describe('generateRoomId', () => {
	it(`returns ${ROOM_ID_LENGTH} characters from the auth-token alphabet`, () => {
		const id = generateRoomId();
		expect(id).toHaveLength(ROOM_ID_LENGTH);
		expect(RoomIdSchema.parse(id)).toBe(id);
		for (const ch of id) {
			expect(AUTH_TOKEN_ALPHABET).toContain(ch);
		}
	});

	it('does not emit duplicate ids across a sample', () => {
		const ids = new Set(Array.from({ length: 200 }, () => generateRoomId()));
		expect(ids.size).toBe(200);
	});

	it('is a different length from access tokens so the two cannot be swapped', () => {
		expect(ROOM_ID_LENGTH).not.toBe(AUTH_TOKEN_LENGTH);
		expect(RoomIdSchema.safeParse(generateAuthToken()).success).toBe(false);
	});
});

describe('RoomIdSchema', () => {
	it('accepts existing UUID v4 room ids (any hex case)', () => {
		expect(RoomIdSchema.parse(UUID_V4)).toBe(UUID_V4);
		expect(RoomIdSchema.safeParse(UUID_V4.toUpperCase()).success).toBe(true);
	});

	it('accepts a new 18-char id and preserves case', () => {
		const id = 'Ab3-_xY9QRstuvW012';
		expect(id).toHaveLength(ROOM_ID_LENGTH);
		expect(RoomIdSchema.parse(id)).toBe(id);
	});

	it('rejects junk that must not reach idFromName', () => {
		expect(RoomIdSchema.safeParse('').success).toBe(false);
		expect(RoomIdSchema.safeParse('probe').success).toBe(false);
		expect(RoomIdSchema.safeParse('../../../etc').success).toBe(false);
		expect(RoomIdSchema.safeParse('not-a-uuid').success).toBe(false);
		expect(RoomIdSchema.safeParse('room-1').success).toBe(false);
		expect(RoomIdSchema.safeParse('abcdefghijkl').success).toBe(false);
		expect(RoomIdSchema.safeParse('abcdefghijklmnopq').success).toBe(false);
		expect(RoomIdSchema.safeParse('abcdefghijklmnopqrs').success).toBe(false);
		expect(RoomIdSchema.safeParse('abcdefghijklmnopqr!').success).toBe(false);
	});
});
