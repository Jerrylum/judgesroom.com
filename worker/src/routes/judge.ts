import type { Judge } from '@judgesroom.com/protocol/src/judging';
import { JudgeSchema } from '@judgesroom.com/protocol/src/judging';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { judges } from '../db/schema';
import { eq } from 'drizzle-orm';
import z from 'zod';
import type { ClientRouter } from '../client-router';
import { transaction } from '../utils';
import { assertAuthenticatedJudgeAdvisor, generateAuthToken } from '../access/tokens';

export async function getJudges(db: DatabaseOrTransaction): Promise<Judge[]> {
	return db.select({ id: judges.id, name: judges.name, groupId: judges.groupId }).from(judges);
}

export async function upsertJudge(db: DatabaseOrTransaction, judge: Judge): Promise<void> {
	await db
		.insert(judges)
		.values({
			id: judge.id,
			name: judge.name,
			groupId: judge.groupId,
			authToken: generateAuthToken()
		})
		.onConflictDoUpdate({
			target: [judges.id],
			set: {
				name: judge.name,
				groupId: judge.groupId
			}
		});
}

export function buildJudgeRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getJudges: w.procedure.output(z.array(JudgeSchema)).query(async ({ ctx }) => {
			return getJudges(ctx.db);
		}),
		updateJudge: w.procedure.input(JudgeSchema).mutation(async ({ ctx, input, session }) => {
			if (ctx.auth.isAuthenticated()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			await upsertJudge(ctx.db, input);

			// Do not wait for the broadcast to complete
			getJudges(ctx.db).then((judgesList) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.mutation(judgesList);
			});
		}),
		updateAllJudges: w.procedure.input(z.array(JudgeSchema)).mutation(async ({ ctx, input, session }) => {
			if (ctx.auth.isAuthenticated()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			await transaction(ctx.db, async (tx) => {
				const allJudges = await tx.select().from(judges);
				for (const v of allJudges) {
					if (!input.some((v2) => v2.id === v.id)) {
						await ctx.network.kickClientsWhere(
							(entry) =>
								entry.authentication.isAccessControlled && entry.authentication.role === 'judge' && entry.authentication.judgeId === v.id
						);
						await tx.delete(judges).where(eq(judges.id, v.id));
					}
				}

				for (const judge of input) {
					await upsertJudge(tx, judge);
				}
			});

			// Do not wait for the broadcast to complete
			getJudges(ctx.db).then((judgesList) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.mutation(judgesList);
			});
		})
	};
}
