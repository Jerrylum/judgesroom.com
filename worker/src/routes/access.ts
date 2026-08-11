import { AccessLinksSchema, AuthTokenSchema } from '@judgesroom.com/protocol/src/access';
import { WRPCError, type WRPCRootObject } from '@jerrylum/wrpc/server';
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
import { broadcastDeviceListUpdate } from './device';

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
			.mutation(async ({ ctx, input, session }) => {
				assertAuthenticatedJudgeAdvisor(ctx.auth);

				const authToken = generateAuthToken();
				const updated = await ctx.db.update(judges).set({ authToken }).where(eq(judges.id, input.judgeId)).returning();
				if (updated.length === 0) {
					throw new WRPCError('CRITICAL: Judge not found');
				}

				await ctx.network.kickJudge(input.judgeId);

				// Always broadcast: already-offline kicks do not get a webSocketClose update.
				broadcastDeviceListUpdate(ctx, session);

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

			// Update the judge advisor auth token
			await upsertJudgeAdvisorAuthToken(ctx.db, authToken);

			// Set the authentication of the current client
			ctx.auth.setAuthentication(authentication);

			// Kick all other judge advisors
			for (const c of ctx.network.getAllClientAuthentications()) {
				if (
					c.clientId !== session.currentClient.clientId &&
					c.authentication.isAccessControlled &&
					c.authentication.role === 'judge_advisor'
				) {
					await ctx.network.kickClient(c.clientId);
				}
			}

			// Always broadcast: already-offline kicks do not get a webSocketClose update.
			broadcastDeviceListUpdate(ctx, session);

			return { authToken };
		})
	};
}
