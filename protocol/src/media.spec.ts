import { describe, it, expect } from 'vitest';
import {
	ALLOWED_PHOTO_CONTENT_TYPES,
	MAX_PHOTO_BYTES,
	MAX_PHOTOS_PER_ROOM,
	MAX_PHOTOS_PER_TEAM,
	buildPhotoViewPath
} from './media';

describe('buildPhotoViewPath', () => {
	const roomId = '550e8400-e29b-41d4-a716-446655440001';
	const photoId = '550e8400-e29b-41d4-a716-446655440002';
	const secret = '550e8400-e29b-41d4-a716-446655440003';

	it('puts roomId, photoId, and secret in the query (the capability)', () => {
		const path = buildPhotoViewPath(roomId, photoId, secret);
		const url = new URL(path, 'https://judgesroom.com');
		expect(url.pathname).toBe('/media/photo');
		expect(url.searchParams.get('roomId')).toBe(roomId);
		expect(url.searchParams.get('photoId')).toBe(photoId);
		expect(url.searchParams.get('secret')).toBe(secret);
		expect(url.searchParams.has('auth')).toBe(false);
		expect(url.searchParams.has('token')).toBe(false);
	});

	it('encodes query values', () => {
		const path = buildPhotoViewPath('a b', 'c/d', 'e&f');
		expect(path).toContain('roomId=a%20b');
		expect(path).toContain('photoId=c%2Fd');
		expect(path).toContain('secret=e%26f');
	});
});

describe('photo limits and types', () => {
	it('keeps binary types that are not scriptable SVG', () => {
		expect(ALLOWED_PHOTO_CONTENT_TYPES).toEqual(['image/jpeg', 'image/webp', 'image/png']);
		expect(ALLOWED_PHOTO_CONTENT_TYPES).not.toContain('image/svg+xml');
		expect(MAX_PHOTO_BYTES).toBe(3 * 1024 * 1024);
		expect(MAX_PHOTOS_PER_TEAM).toBe(10);
		expect(MAX_PHOTOS_PER_ROOM).toBe(500);
	});
});
