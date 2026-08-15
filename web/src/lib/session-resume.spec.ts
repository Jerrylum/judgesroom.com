import { describe, expect, it } from 'vitest';
import { connectionResumeStep } from './session-resume';

describe('connectionResumeStep', () => {
	it('resumes after wrpc auto-reconnect (reconnecting → connecting → connected)', () => {
		let pending = false;
		pending = connectionResumeStep('reconnecting', true, pending).reconnectPending;
		expect(pending).toBe(true);
		const afterConnecting = connectionResumeStep('connecting', true, pending);
		expect(afterConnecting).toEqual({ resume: false, reconnectPending: true });
		expect(connectionResumeStep('connected', true, afterConnecting.reconnectPending)).toEqual({
			resume: true,
			reconnectPending: false
		});
	});

	it('still resumes if wrpc ever hops reconnecting → connected', () => {
		expect(connectionResumeStep('connected', true, true)).toEqual({ resume: true, reconnectPending: false });
	});

	it('does not resume the first connect (join/create already in flight)', () => {
		expect(connectionResumeStep('connecting', true, false)).toEqual({ resume: false, reconnectPending: false });
		expect(connectionResumeStep('connected', true, false)).toEqual({ resume: false, reconnectPending: false });
	});

	it('does not resume after leave or before a room exists', () => {
		expect(connectionResumeStep('connected', false, true)).toEqual({ resume: false, reconnectPending: false });
	});

	it('clears a pending reconnect on offline or error', () => {
		expect(connectionResumeStep('offline', true, true)).toEqual({ resume: false, reconnectPending: false });
		expect(connectionResumeStep('error', true, true)).toEqual({ resume: false, reconnectPending: false });
	});
});
