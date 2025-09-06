import { Judge, JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import { DatabaseOrTransaction, w } from '../server-router';
import { judges } from '../db/schema';
import { eq } from 'drizzle-orm';
import z from 'zod';

export async function getJudges(db: DatabaseOrTransaction): Promise<Judge[]> {
	return db.transaction(async (tx) => {
		return tx.select().from(judges) as Promise<Judge[]>;
	});
}

export async function upsertJudge(db: DatabaseOrTransaction, judge: Judge): Promise<void> {
	return db.transaction(async (tx) => {
		await tx
			.insert(judges)
			.values(judge)
			.onConflictDoUpdate({
				target: [judges.id],
				set: judge
			});
	});
}

export async function removeJudge(db: DatabaseOrTransaction, judge: Judge): Promise<void> {
	return db.transaction(async (tx) => {
		await tx.delete(judges).where(eq(judges.id, judge.id));
	});
}

export const judge = {
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
