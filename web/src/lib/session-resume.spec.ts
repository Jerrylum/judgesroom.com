import { describe, expect, it } from 'vitest';
import { shouldResumeJudgesRoom } from './session-resume';

describe('shouldResumeJudgesRoom', () => {
	it('resumes only after wrpc auto-reconnect while still in a room', () => {
		expect(shouldResumeJudgesRoom('reconnecting', 'connected', true)).toBe(true);
	});

	it('does not resume the first connect (join/create already in flight)', () => {
		expect(shouldResumeJudgesRoom('connecting', 'connected', true)).toBe(false);
		expect(shouldResumeJudgesRoom('offline', 'connected', true)).toBe(false);
	});

	it('does not resume after leave or before a room exists', () => {
		expect(shouldResumeJudgesRoom('reconnecting', 'connected', false)).toBe(false);
	});

	it('does not resume on non-connected transitions', () => {
		expect(shouldResumeJudgesRoom('connected', 'reconnecting', true)).toBe(false);
		expect(shouldResumeJudgesRoom('reconnecting', 'error', true)).toBe(false);
	});
});
