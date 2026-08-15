import type { Judge } from '@judgesroom.com/protocol/src/judging';
import { JudgeSchema } from '@judgesroom.com/protocol/src/judging';
import type { WRPCRootObject } from '@jerrylum/wrpc/server';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { judges } from '../db/schema';
import { eq } from 'drizzle-orm';
import z from 'zod';
import type { ClientRouter } from '../client-router';
import { transaction } from '../utils';
import { assertAuthenticatedJudgeAdvisor, generateAuthToken } from '../access/tokens';
import { broadcastDeviceListUpdate } from './device';

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

export async function removeJudge(db: DatabaseOrTransaction, judgeId: string): Promise<void> {
	await db.delete(judges).where(eq(judges.id, judgeId));
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
				session.broadcast<ClientRouter>().onAllJudgesUpdate.notify(judgesList);
			});
		}),
		removeJudge: w.procedure.input(z.object({ judgeId: z.uuidv4() })).mutation(async ({ ctx, input, session }) => {
			if (ctx.auth.isAuthenticated()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			await removeJudge(ctx.db, input.judgeId);
			await ctx.network.kickJudge(input.judgeId);

			getJudges(ctx.db).then((judgesList) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.notify(judgesList);
			});

			// Always broadcast: already-offline kicks do not get a webSocketClose update.
			broadcastDeviceListUpdate(ctx, session);
		}),
		updateAllJudges: w.procedure.input(z.array(JudgeSchema)).mutation(async ({ ctx, input, session }) => {
			if (ctx.auth.isAuthenticated()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			const removedJudges = await transaction(ctx.db, async (tx) => {
				const allJudges = await tx.select().from(judges);
				const rtn = new Set<string>();

				for (const v of allJudges) {
					if (!input.some((v2) => v2.id === v.id)) {
						rtn.add(v.id);
						await tx.delete(judges).where(eq(judges.id, v.id));
					}
				}

				for (const judge of input) {
					await upsertJudge(tx, judge);
				}

				return Array.from(rtn);
			});

			// Do not wait for the broadcast to complete
			getJudges(ctx.db).then((judgesList) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.notify(judgesList);
			});

			await Promise.all(removedJudges.map((judgeId) => ctx.network.kickJudge(judgeId)));

			// Always broadcast: already-offline kicks do not get a webSocketClose update.
			broadcastDeviceListUpdate(ctx, session);
		})
	};
}
