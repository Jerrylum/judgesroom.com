import { z } from 'zod';

export const AUTH_TOKEN_LENGTH = 12;
export const AUTH_TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Singleton primary key for the one Judge Advisors row per room. */
export const JUDGE_ADVISOR_SINGLETON_ID = 'judge_advisor';

export const AuthTokenSchema = z
	.string()
	.length(AUTH_TOKEN_LENGTH)
	.regex(/^[a-zA-Z0-9]+$/, { message: 'Auth token must be alphanumeric' });

export type AuthToken = z.infer<typeof AuthTokenSchema>;

export function generateAuthToken(): AuthToken {
	const bytes = new Uint8Array(AUTH_TOKEN_LENGTH);
	crypto.getRandomValues(bytes);
	let token = '';
	for (let i = 0; i < AUTH_TOKEN_LENGTH; i++) {
		token += AUTH_TOKEN_ALPHABET[bytes[i]! % AUTH_TOKEN_ALPHABET.length];
	}
	return token as AuthToken;
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
