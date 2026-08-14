import { describe, it, expect } from 'vitest';
import { photoCacheTag, photoCacheTags, photoContentHeaders, roomPhotoCacheTag, timingSafeEqualString, PHOTO_CACHE_MAX_AGE_SECONDS, UPLOAD_TOKEN_TTL_MS } from './constants';

describe('media cache tag helpers', () => {
	it('builds photo and room tags', () => {
		const roomId = '550e8400-e29b-41d4-a716-446655440001';
		const photoId = '550e8400-e29b-41d4-a716-446655440002';

		expect(photoCacheTag(photoId)).toBe(`photo-${photoId}`);
		expect(roomPhotoCacheTag(roomId)).toBe(`room-${roomId}`);
		expect(photoCacheTags(roomId, photoId)).toEqual([`room-${roomId}`, `photo-${photoId}`]);
	});

	it('uses a 24h public cache TTL and 10-minute upload tokens', () => {
		expect(PHOTO_CACHE_MAX_AGE_SECONDS).toBe(86400);
		expect(UPLOAD_TOKEN_TTL_MS).toBe(10 * 60 * 1000);
	});

	it('sets nosniff on photo responses so labeled image bytes are not sniffed as HTML', () => {
		const headers = photoContentHeaders('image/jpeg', `public, max-age=${PHOTO_CACHE_MAX_AGE_SECONDS}`);
		expect(headers['X-Content-Type-Options']).toBe('nosniff');
		expect(headers['Content-Type']).toBe('image/jpeg');
		expect(headers['Cache-Control']).toBe('public, max-age=86400');
	});

	it('timingSafeEqualString compares equality without leaking length early for equal-length strings', () => {
		expect(timingSafeEqualString('abc', 'abc')).toBe(true);
		expect(timingSafeEqualString('abc', 'abd')).toBe(false);
		expect(timingSafeEqualString('abc', 'ab')).toBe(false);
	});
});
