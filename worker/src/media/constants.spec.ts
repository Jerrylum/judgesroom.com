import { describe, it, expect } from 'vitest';
import { photoCacheTag, photoCacheTags, roomPhotoCacheTag, timingSafeEqualString } from './constants';

describe('media cache tag helpers', () => {
	it('builds photo and room tags', () => {
		const roomId = '550e8400-e29b-41d4-a716-446655440001';
		const photoId = '550e8400-e29b-41d4-a716-446655440002';

		expect(photoCacheTag(photoId)).toBe(`photo-${photoId}`);
		expect(roomPhotoCacheTag(roomId)).toBe(`room-${roomId}`);
		expect(photoCacheTags(roomId, photoId)).toEqual([`room-${roomId}`, `photo-${photoId}`]);
	});

	it('timingSafeEqualString compares equality without leaking length early for equal-length strings', () => {
		expect(timingSafeEqualString('abc', 'abc')).toBe(true);
		expect(timingSafeEqualString('abc', 'abd')).toBe(false);
		expect(timingSafeEqualString('abc', 'ab')).toBe(false);
	});
});
