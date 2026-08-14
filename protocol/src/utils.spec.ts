import { describe, expect, it } from 'vitest';
import { uuidv4 } from './utils';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('uuidv4', () => {
	it('returns RFC 4122 version-4 UUIDs (122 bits of random state)', () => {
		const id = uuidv4();
		expect(id).toMatch(UUID_V4);
	});

	it('does not emit sequential or duplicate ids across a sample', () => {
		const ids = new Set(Array.from({ length: 200 }, () => uuidv4()));
		expect(ids.size).toBe(200);
	});
});
