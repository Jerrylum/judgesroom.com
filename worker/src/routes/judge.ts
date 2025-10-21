import type { Judge } from '@judgesroom.com/protocol/src/judging';
import { JudgeSchema } from '@judgesroom.com/protocol/src/judging';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { judges } from '../db/schema';
import { eq } from 'drizzle-orm';
import z from 'zod';
import type { ClientRouter } from '@judgesroom.com/web/src/lib/client-router';
import { transaction } from '../utils';

export async function getJudges(db: DatabaseOrTransaction): Promise<Judge[]> {
	return db.select().from(judges) as Promise<Judge[]>;
}

export async function upsertJudge(db: DatabaseOrTransaction, judge: Judge): Promise<void> {
	await db
		.insert(judges)
		.values(judge)
		.onConflictDoUpdate({
			target: [judges.id],
			set: judge
		});
}

export async function removeJudge(db: DatabaseOrTransaction, judge: Judge): Promise<void> {
	await db.delete(judges).where(eq(judges.id, judge.id));
}

export function buildJudgeRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getJudges: w.procedure.output(z.array(JudgeSchema)).query(async ({ ctx }) => {
			return getJudges(ctx.db);
		}),
		updateJudge: w.procedure.input(JudgeSchema).mutation(async ({ ctx, input, session }) => {
			await upsertJudge(ctx.db, input);
			// Do not wait for the broadcast to complete
			getJudges(ctx.db).then((judges) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.mutation(judges);
			});
		}),
		removeJudge: w.procedure.input(JudgeSchema).mutation(async ({ ctx, input, session }) => {
			await removeJudge(ctx.db, input);
			// Do not wait for the broadcast to complete
			getJudges(ctx.db).then((judges) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.mutation(judges);
			});
		}),
		updateAllJudges: w.procedure.input(z.array(JudgeSchema)).mutation(async ({ ctx, input, session }) => {
			await transaction(ctx.db, async (tx) => {
				// Use for loop instead of bulk insert/delete to avoid SQLite error
				// See: https://github.com/drizzle-team/drizzle-orm/issues/2479
				const allJudges = await tx.select().from(judges);
				for (const v of allJudges) {
					if (!input.some((v2) => v2.id === v.id)) {
						await tx.delete(judges).where(eq(judges.id, v.id));
					}
				}

				// insert the input
				for (const judge of input) {
					await tx
						.insert(judges)
						.values(judge)
						.onConflictDoUpdate({
							target: [judges.id],
							set: judge
						});
				}
			});
			// Do not wait for the broadcast to complete
			getJudges(ctx.db).then((judges) => {
				session.broadcast<ClientRouter>().onAllJudgesUpdate.mutation(judges);
			});
		})
	};
}
