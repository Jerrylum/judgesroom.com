import { describe, it, expect } from 'vitest';
import {
	AUTH_TOKEN_ALPHABET,
	AUTH_TOKEN_LENGTH,
	AuthTokenSchema,
	ConnectAuthCloseReason,
	MAX_CONNECTIONS_PER_ACCESS_LINK,
	clientAuthenticationsEqual,
	generateAuthToken,
	isConnectAuthCloseReason,
	uncontrolledAuthentication,
	type ClientAuthentication
} from './access';

const judgeIdA = '550e8400-e29b-41d4-a716-4466554400aa';
const judgeIdB = '550e8400-e29b-41d4-a716-4466554400bb';

describe('generateAuthToken', () => {
	it(`returns ${AUTH_TOKEN_LENGTH} characters from the published alphabet`, () => {
		const token = generateAuthToken();
		expect(token).toHaveLength(AUTH_TOKEN_LENGTH);
		expect(AuthTokenSchema.parse(token)).toBe(token);
		for (const ch of token) {
			expect(AUTH_TOKEN_ALPHABET).toContain(ch);
		}
	});

	it('does not emit duplicate tokens across a sample (unguessable for a short-lived room)', () => {
		const tokens = new Set(Array.from({ length: 200 }, () => generateAuthToken()));
		expect(tokens.size).toBe(200);
	});

	it('rejects short, long, or characters outside the alphabet', () => {
		expect(AuthTokenSchema.safeParse('short').success).toBe(false);
		expect(AuthTokenSchema.safeParse('abcdefghijklm').success).toBe(false);
		expect(AuthTokenSchema.safeParse('abcdefghi jk').success).toBe(false);
		expect(AuthTokenSchema.safeParse('abcdefghijk!').success).toBe(false);
	});

	it('accepts hyphen and underscore so existing alphanumeric tokens remain valid', () => {
		expect(AuthTokenSchema.safeParse('abcdEFGH-12_').success).toBe(true);
		expect(AuthTokenSchema.safeParse('abcdefghijkl').success).toBe(true);
	});

	it('uses a 64-character alphabet so every byte maps uniformly via % 64', () => {
		expect(AUTH_TOKEN_ALPHABET).toHaveLength(64);
		expect(256 % AUTH_TOKEN_ALPHABET.length).toBe(0);
		expect(AUTH_TOKEN_ALPHABET).toContain('-');
		expect(AUTH_TOKEN_ALPHABET).toContain('_');
	});
});

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

describe('connect-time close reasons', () => {
	it('recognizes the per-link connection cap', () => {
		expect(MAX_CONNECTIONS_PER_ACCESS_LINK).toBe(100);
		expect(isConnectAuthCloseReason(ConnectAuthCloseReason.TOO_MANY_CONNECTIONS)).toBe(true);
		expect(isConnectAuthCloseReason(` ${ConnectAuthCloseReason.TOO_MANY_CONNECTIONS} `)).toBe(true);
		expect(isConnectAuthCloseReason('Client already connected')).toBe(false);
	});
});
