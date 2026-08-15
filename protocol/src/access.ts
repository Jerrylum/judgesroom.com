import { z } from 'zod';

export const AUTH_TOKEN_LENGTH = 12;
/** 64 URL-safe characters so each random byte maps uniformly via `% 64`. */
export const AUTH_TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

/** Singleton primary key for the one Judge Advisors row per room. */
export const JUDGE_ADVISOR_SINGLETON_ID = 'judge_advisor';

export const AuthTokenSchema = z
	.string()
	.length(AUTH_TOKEN_LENGTH)
	.regex(/^[a-zA-Z0-9_-]+$/, { message: 'Auth token must be alphanumeric, hyphen, or underscore' });

export type AuthToken = z.infer<typeof AuthTokenSchema>;

/** Maps each random byte uniformly onto AUTH_TOKEN_ALPHABET (length 64). */
export function generateAlphabetToken(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => AUTH_TOKEN_ALPHABET[byte % AUTH_TOKEN_ALPHABET.length]!).join('');
}

export function generateAuthToken(): AuthToken {
	return generateAlphabetToken(AUTH_TOKEN_LENGTH) as AuthToken;
}

/** Connection/session auth stored on the WebSocket attachment and returned to the owning client. */
// z.union (not discriminatedUnion): Zod 4 forbids duplicate discriminator values (two `true` arms).
export const ClientAuthenticationSchema = z.union([
	z.object({
		isAccessControlled: z.literal(true),
		authToken: AuthTokenSchema,
		role: z.literal('judge_advisor')
	}),
	z.object({
		isAccessControlled: z.literal(true),
		authToken: AuthTokenSchema,
		role: z.literal('judge'),
		judgeId: z.uuidv4()
	}),
	z.object({
		isAccessControlled: z.literal(false)
	})
]);

export type ClientAuthentication = z.infer<typeof ClientAuthenticationSchema>;

export const uncontrolledAuthentication = { isAccessControlled: false } as const satisfies ClientAuthentication;

/** AC-on cap: live sockets per judge before authorizeConnect rejects the newcomer (S5-2). JA is uncapped. */
export const MAX_CONNECTIONS_PER_ACCESS_LINK = 100;

/** Close-reason strings for connect-time access-control denials (accept-then-close). */
export const ConnectAuthCloseReason = {
	ACCESS_LINK_REQUIRED: 'Access link required',
	INVALID_ACCESS_LINK: 'Invalid or expired access link',
	DEVICE_AUTH_CONFLICT: 'Device already authenticated with different credentials',
	TOO_MANY_CONNECTIONS: 'Too many connections for this access link'
} as const;

export type ConnectAuthCloseReason = (typeof ConnectAuthCloseReason)[keyof typeof ConnectAuthCloseReason];

export function isConnectAuthCloseReason(reason: string): boolean {
	return (Object.values(ConnectAuthCloseReason) as string[]).includes(reason.trim());
}

/** Structural equality for connection/session ClientAuthentication values. */
export function clientAuthenticationsEqual(a: ClientAuthentication, b: ClientAuthentication): boolean {
	if (a.isAccessControlled !== b.isAccessControlled) {
		return false;
	}
	if (!a.isAccessControlled || !b.isAccessControlled) {
		return true;
	}
	if (a.role !== b.role || a.authToken !== b.authToken) {
		return false;
	}
	if (a.role === 'judge' && b.role === 'judge') {
		return a.judgeId === b.judgeId;
	}
	return true;
}

/** Public device-list auth (never includes authToken). */
export const DeviceAuthenticatedSchema = z.discriminatedUnion('role', [
	z.object({
		role: z.literal('judge_advisor')
	}),
	z.object({
		role: z.literal('judge'),
		judgeId: z.uuidv4()
	})
]);

export type DeviceAuthenticated = z.infer<typeof DeviceAuthenticatedSchema>;

export function toDeviceAuthenticated(authentication: ClientAuthentication): DeviceAuthenticated | null {
	if (!authentication.isAccessControlled) {
		return null;
	}
	if (authentication.role === 'judge_advisor') {
		return { role: 'judge_advisor' };
	}
	return { role: 'judge', judgeId: authentication.judgeId };
}

export const AccessLinkJudgeSchema = z.object({
	judgeId: z.uuidv4(),
	name: z.string(),
	authToken: AuthTokenSchema
});

export type AccessLinkJudge = z.infer<typeof AccessLinkJudgeSchema>;

export const AccessLinksSchema = z.object({
	judgeAdvisorAuthToken: AuthTokenSchema,
	judges: z.array(AccessLinkJudgeSchema)
});

export type AccessLinks = z.infer<typeof AccessLinksSchema>;
