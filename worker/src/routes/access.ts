import { AccessLinksSchema, AuthTokenSchema } from '@judgesroom.com/protocol/src/access';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import { eq } from 'drizzle-orm';
import z from 'zod';
import {
	assertAuthenticatedJudgeAdvisor,
	generateAuthToken,
	getJudgeAdvisorAuthToken,
	upsertJudgeAdvisorAuthToken
} from '../access/tokens';
import { judges } from '../db/schema';
import type { ClientRouter } from '../client-router';
import type { ServerContext } from '../server-router';
import { WRPCError } from '@judgesroom.com/wrpc/server/types';

export function buildAccessRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		listAccessLinks: w.procedure.output(AccessLinksSchema).query(async ({ ctx }) => {
			assertAuthenticatedJudgeAdvisor(ctx.auth);

			const judgeAdvisorAuthToken = await getJudgeAdvisorAuthToken(ctx.db);
			if (!judgeAdvisorAuthToken) {
				throw new WRPCError('CRITICAL: No Judge Advisor access token');
			}

			const judgeRows = await ctx.db.select({ judgeId: judges.id, name: judges.name, authToken: judges.authToken }).from(judges);

			return {
				judgeAdvisorAuthToken,
				judges: judgeRows.map((row) => ({
					judgeId: row.judgeId,
					name: row.name,
					authToken: row.authToken
				}))
			};
		}),

		rotateJudgeAuth: w.procedure
			.input(z.object({ judgeId: z.uuidv4() }))
			.output(z.object({ authToken: AuthTokenSchema }))
			.mutation(async ({ ctx, input }) => {
				assertAuthenticatedJudgeAdvisor(ctx.auth);

				const authToken = generateAuthToken();
				const updated = await ctx.db.update(judges).set({ authToken }).where(eq(judges.id, input.judgeId)).returning();
				if (updated.length === 0) {
					throw new WRPCError('CRITICAL: Judge not found');
				}

				await ctx.network.kickClientsWhere(
					(entry) =>
						entry.authentication.isAccessControlled &&
						entry.authentication.role === 'judge' &&
						entry.authentication.judgeId === input.judgeId
				);

				return { authToken };
			}),

		rotateJudgeAdvisorAuth: w.procedure.output(z.object({ authToken: AuthTokenSchema })).mutation(async ({ ctx, session }) => {
			assertAuthenticatedJudgeAdvisor(ctx.auth);

			const authToken = generateAuthToken();
			const authentication = {
				isAccessControlled: true as const,
				authToken,
				role: 'judge_advisor' as const
			};

			// Client ACK first — if this fails, leave DB token and attachment unchanged.
			await session.getClient<ClientRouter>(session.currentClient.clientId).onClientAuthenticationChange.mutation(authentication);

			await upsertJudgeAdvisorAuthToken(ctx.db, authToken);
			ctx.auth.setAuthentication(authentication);

			await ctx.network.kickClientsWhere(
				(entry) =>
					entry.clientId !== session.currentClient.clientId &&
					entry.authentication.isAccessControlled &&
					entry.authentication.role === 'judge_advisor'
			);

			return { authToken };
		})
	};
}
