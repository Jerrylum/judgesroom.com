import { describe, expect, it } from 'vitest';
import { buildAccessLinksCsv } from './judges-csv';

describe('buildAccessLinksCsv', () => {
	it('formats rows with a header', () => {
		const csv = buildAccessLinksCsv([
			{
				role: 'Judge Advisor',
				name: 'Judge Advisor',
				group: '',
				accessLink: 'https://example.com/join?roomId=1&auth=abc'
			},
			{
				role: 'Judge',
				name: 'Alice',
				group: 'Group A',
				accessLink: 'https://example.com/join?roomId=1&auth=def'
			}
		]);
		expect(csv).toBe(
			[
				'Role,Name,Group,AccessLink',
				'Judge Advisor,Judge Advisor,,https://example.com/join?roomId=1&auth=abc',
				'Judge,Alice,Group A,https://example.com/join?roomId=1&auth=def',
				''
			].join('\n')
		);
	});

	it('escapes commas and quotes in cells', () => {
		const csv = buildAccessLinksCsv([
			{
				role: 'Judge',
				name: 'Last, "First"',
				group: 'A, B',
				accessLink: 'https://example.com'
			}
		]);
		expect(csv).toContain('"Last, ""First"""');
		expect(csv).toContain('"A, B"');
	});
});
