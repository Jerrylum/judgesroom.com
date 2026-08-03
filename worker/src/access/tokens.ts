import {
	AuthTokenSchema,
	JUDGE_ADVISOR_SINGLETON_ID,
	generateAuthToken,
	type AuthToken,
	type ClientAuthentication
} from '@judgesroom.com/protocol/src/access';
import { eq } from 'drizzle-orm';
import { WRPCError } from '@judgesroom.com/wrpc/server/types';
import { judgeAdvisors, judges } from '../db/schema';
import type { DatabaseOrTransaction } from '../server-router';
import type { Authentication } from './authentication';

export { generateAuthToken, JUDGE_ADVISOR_SINGLETON_ID };

export async function getJudgeAdvisorAuthToken(db: DatabaseOrTransaction): Promise<string | null> {
	const [row] = await db
		.select({ authToken: judgeAdvisors.authToken })
		.from(judgeAdvisors)
		.where(eq(judgeAdvisors.id, JUDGE_ADVISOR_SINGLETON_ID))
		.limit(1);
	return row?.authToken ?? null;
}

export async function upsertJudgeAdvisorAuthToken(db: DatabaseOrTransaction, authToken: AuthToken): Promise<void> {
	await db
		.insert(judgeAdvisors)
		.values({ id: JUDGE_ADVISOR_SINGLETON_ID, authToken })
		.onConflictDoUpdate({
			target: [judgeAdvisors.id],
			set: { authToken }
		});
}

export async function resolveClientAuthentication(
	db: DatabaseOrTransaction,
	auth: string
): Promise<Extract<ClientAuthentication, { isAccessControlled: true }> | null> {
	const parsed = AuthTokenSchema.safeParse(auth);
	if (!parsed.success) {
		return null;
	}

	const jaToken = await getJudgeAdvisorAuthToken(db);
	if (jaToken === parsed.data) {
		return { isAccessControlled: true, authToken: parsed.data, role: 'judge_advisor' };
	}

	const [judge] = await db.select({ id: judges.id }).from(judges).where(eq(judges.authToken, parsed.data)).limit(1);
	if (judge) {
		return { isAccessControlled: true, authToken: parsed.data, role: 'judge', judgeId: judge.id };
	}

	return null;
}

export function assertAuthenticatedJudgeAdvisor(auth: Authentication): void {
	if (!auth.isAuthenticatedJudgeAdvisor()) {
		throw new WRPCError('CRITICAL: Only the Judge Advisor with access control enabled can perform this action');
	}
}

/**
 * Bound judges must match payload judgeId (null only allowed for JA / uncontrolled).
 * Does not require authentication when AC is on — that is guaranteed by authorizeConnect
 * plus kicking all other clients when AC is toggled (see essential.updateEssentialData).
 * Rubric row authorship is also enforced at write time via ON CONFLICT … setWhere + RETURNING.
 */
export function assertAuthorship(auth: Authentication, submissionJudgeId: string | null): void {
	const judgeId = auth.getJudgeId();
	if (auth.isAuthenticatedJudge() && judgeId && submissionJudgeId !== judgeId) {
		throw new WRPCError('CRITICAL: The authenticated identity does not match the submission judge');
	}
}
