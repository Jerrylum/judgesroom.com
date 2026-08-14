import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Preferences } from './preferences.svelte';
import { buildJudgesRoomJoinUrl, generateUUID, parseAuthTokenFromUrl, parseJudgesRoomUrl } from './utils.svelte';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function memoryStorage() {
	const data = new Map<string, unknown>();
	return {
		save(key: string, value: unknown) {
			data.set(key, value);
		},
		load<T>(key: string): T | null {
			return (data.get(key) as T | undefined) ?? null;
		},
		remove(key: string) {
			data.delete(key);
		},
		clear() {
			data.clear();
		}
	};
}

describe('room identity — client mint and join URLs', () => {
	it('generateUUID returns RFC 4122 version-4 ids', () => {
		expect(generateUUID()).toMatch(UUID_V4);
	});

	it('parseJudgesRoomUrl accepts only uuid v4 roomId query values', () => {
		const id = '550e8400-e29b-41d4-a716-446655440000';
		expect(parseJudgesRoomUrl(`https://judgesroom.com/join?roomId=${id}`)).toBe(id);
		expect(parseJudgesRoomUrl(`https://judgesroom.com/app?roomId=${id}&auth=abcdefghijkl`)).toBe(id);
		expect(parseJudgesRoomUrl('https://judgesroom.com/join?roomId=not-a-uuid')).toBeNull();
		expect(parseJudgesRoomUrl('https://judgesroom.com/join?roomId=')).toBeNull();
		expect(parseJudgesRoomUrl('https://judgesroom.com/join')).toBeNull();

		const parsedUpper = parseJudgesRoomUrl(`https://judgesroom.com/join?roomId=${id.toUpperCase()}`);
		expect(parsedUpper).toBeTruthy();
		expect(z.uuidv4().safeParse(parsedUpper).success).toBe(true);
	});

	it('parseAuthTokenFromUrl ignores missing or malformed auth without throwing', () => {
		expect(parseAuthTokenFromUrl('https://judgesroom.com/join?roomId=x')).toBeNull();
		expect(parseAuthTokenFromUrl('https://judgesroom.com/join?auth=short')).toBeNull();
		expect(parseAuthTokenFromUrl('https://judgesroom.com/join?auth=abcdefghijkl')).toBe('abcdefghijkl');
	});

	it('buildJudgesRoomJoinUrl puts roomId (and optional auth) in the query string', () => {
		const id = '550e8400-e29b-41d4-a716-446655440000';
		expect(buildJudgesRoomJoinUrl('https://judgesroom.com', id)).toBe(`https://judgesroom.com/join?roomId=${id}`);
		expect(buildJudgesRoomJoinUrl('https://judgesroom.com', id, 'abcdefghijkl')).toBe(
			`https://judgesroom.com/join?roomId=${id}&auth=abcdefghijkl`
		);
		expect(buildJudgesRoomJoinUrl('https://judgesroom.com', id, null)).toBe(`https://judgesroom.com/join?roomId=${id}`);
	});

	it('Google Analytics is enabled by default (join URL may be sent as page_location)', () => {
		const preferences = new Preferences(memoryStorage() as never);
		expect(preferences.get('isGoogleAnalyticsEnabled')).toBe(true);
	});
});
