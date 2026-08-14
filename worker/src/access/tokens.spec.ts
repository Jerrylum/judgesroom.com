import { describe, it, expect } from 'vitest';
import { Authentication } from './authentication';
import { assertAuthorship, generateAuthToken } from './tokens';
import { uuidv4 } from '@judgesroom.com/protocol/src/utils';

describe('assertAuthorship', () => {
	const judgeId = uuidv4();
	const otherJudgeId = uuidv4();

	it('allows uncontrolled clients to submit as any judge', () => {
		const auth = Authentication.withFixture();
		expect(() => assertAuthorship(auth, judgeId)).not.toThrow();
		expect(() => assertAuthorship(auth, null)).not.toThrow();
	});

	it('allows the Judge Advisor to submit as any judge or none', () => {
		const auth = Authentication.withFixture({
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge_advisor'
		});
		expect(() => assertAuthorship(auth, judgeId)).not.toThrow();
		expect(() => assertAuthorship(auth, null)).not.toThrow();
	});

	it('allows a bound judge to submit only as themselves', () => {
		const auth = Authentication.withFixture({
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge',
			judgeId
		});
		expect(() => assertAuthorship(auth, judgeId)).not.toThrow();
		expect(() => assertAuthorship(auth, otherJudgeId)).toThrow(/authenticated identity/);
		expect(() => assertAuthorship(auth, null)).toThrow(/authenticated identity/);
	});
});
