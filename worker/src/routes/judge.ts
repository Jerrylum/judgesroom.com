import { Judge, JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { judges } from '../db/schema';
import { eq } from 'drizzle-orm';
import z from 'zod';

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
		updateJudge: w.procedure.input(JudgeSchema).mutation(async ({ ctx, input }) => {
			return upsertJudge(ctx.db, input);
		}),
		removeJudge: w.procedure.input(JudgeSchema).mutation(async ({ ctx, input }) => {
			return removeJudge(ctx.db, input);
		})
	};
}
