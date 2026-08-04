import { describe, it, expect } from 'vitest';
import {
	clientAuthenticationsEqual,
	generateAuthToken,
	uncontrolledAuthentication,
	type ClientAuthentication
} from './access';

const judgeIdA = '550e8400-e29b-41d4-a716-4466554400aa';
const judgeIdB = '550e8400-e29b-41d4-a716-4466554400bb';

describe('clientAuthenticationsEqual', () => {
	it('treats uncontrolled authentications as equal', () => {
		const a: ClientAuthentication = { isAccessControlled: false };
		const b = uncontrolledAuthentication;
		expect(clientAuthenticationsEqual(a, b)).toBe(true);
	});

	it('treats matching judge advisor authentications as equal', () => {
		const authToken = generateAuthToken();
		const a: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge_advisor' };
		const b: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge_advisor' };
		expect(clientAuthenticationsEqual(a, b)).toBe(true);
	});

	it('treats matching judge authentications as equal', () => {
		const authToken = generateAuthToken();
		const a: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge', judgeId: judgeIdA };
		const b: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge', judgeId: judgeIdA };
		expect(clientAuthenticationsEqual(a, b)).toBe(true);
	});

	it('rejects uncontrolled vs controlled', () => {
		const controlled: ClientAuthentication = {
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge_advisor'
		};
		expect(clientAuthenticationsEqual(uncontrolledAuthentication, controlled)).toBe(false);
		expect(clientAuthenticationsEqual(controlled, uncontrolledAuthentication)).toBe(false);
	});

	it('rejects different roles with the same token', () => {
		const authToken = generateAuthToken();
		const advisor: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge_advisor' };
		const judge: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge', judgeId: judgeIdA };
		expect(clientAuthenticationsEqual(advisor, judge)).toBe(false);
	});

	it('rejects judge advisor authentications with different tokens', () => {
		const a: ClientAuthentication = {
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge_advisor'
		};
		const b: ClientAuthentication = {
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge_advisor'
		};
		expect(clientAuthenticationsEqual(a, b)).toBe(false);
	});

	it('rejects judge authentications with different tokens', () => {
		const a: ClientAuthentication = {
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge',
			judgeId: judgeIdA
		};
		const b: ClientAuthentication = {
			isAccessControlled: true,
			authToken: generateAuthToken(),
			role: 'judge',
			judgeId: judgeIdA
		};
		expect(clientAuthenticationsEqual(a, b)).toBe(false);
	});

	it('rejects judge authentications with different judgeIds', () => {
		const authToken = generateAuthToken();
		const a: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge', judgeId: judgeIdA };
		const b: ClientAuthentication = { isAccessControlled: true, authToken, role: 'judge', judgeId: judgeIdB };
		expect(clientAuthenticationsEqual(a, b)).toBe(false);
	});
});
