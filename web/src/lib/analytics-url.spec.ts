import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsUrl } from './analytics-url';

describe('sanitizeAnalyticsUrl', () => {
	it('strips search and hash so join capability never goes to analytics', () => {
		const id = '550e8400-e29b-41d4-a716-446655440000';
		expect(sanitizeAnalyticsUrl(`https://judgesroom.com/app?roomId=${id}&auth=abcdefghijkl`)).toBe(
			'https://judgesroom.com/app'
		);
		expect(sanitizeAnalyticsUrl(`https://judgesroom.com/join?roomId=${id}#frag`)).toBe(
			'https://judgesroom.com/join'
		);
	});

	it('leaves origin and path intact', () => {
		expect(sanitizeAnalyticsUrl('https://judgesroom.com/app')).toBe('https://judgesroom.com/app');
	});
});
