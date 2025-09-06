import type { ServerContext } from '../server-router';
import z from 'zod';
import { EngineeringNotebookRubricSchema, TeamInterviewNoteSchema, TeamInterviewRubricSchema } from '@judging.jerryio/protocol/src/rubric';
import { EngineeringNotebookRubric, TeamInterviewNote, TeamInterviewRubric } from '@judging.jerryio/protocol/src/rubric';
import { eq, sql } from 'drizzle-orm';
import {
	awardRankings,
	engineeringNotebookRubrics,
	finalAwardRankings,
	judgeGroupAwardNominations,
	teamInterviewNotes,
	teamInterviewRubrics
} from '../db/schema';
import { AwardNameSchema } from '@judging.jerryio/protocol/src/award';
import { RankSchema } from '@judging.jerryio/protocol/src/rubric';
import { and } from 'drizzle-orm';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';

export function buildJudgingRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
return {
	getRubricAndNoteByJudgeGroup: w.procedure
		.input(z.object({ judgeGroupId: z.uuidv4() }))
		.output(
			z.array(
				z.object({
					teamId: z.uuidv4(),
					engineeringNotebookRubric: z.number(), // No. of submitted
					teamInterviewRubric: z.number(), // No. of submitted
					teamInterviewNote: z.number() // No. of submitted
				})
			)
		)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.select({
					teamId: engineeringNotebookRubrics.teamId,
					engineeringNotebookRubric: sql<number>`COUNT(${engineeringNotebookRubrics.id})`,
					teamInterviewRubric: sql<number>`COUNT(${teamInterviewRubrics.id})`,
					teamInterviewNote: sql<number>`COUNT(${teamInterviewNotes.id})`
				})
				.from(engineeringNotebookRubrics)
				.leftJoin(teamInterviewRubrics, eq(teamInterviewRubrics.id, engineeringNotebookRubrics.id))
				.leftJoin(teamInterviewNotes, eq(teamInterviewNotes.id, engineeringNotebookRubrics.id))
				.where(eq(engineeringNotebookRubrics.judgeId, input.judgeGroupId))
				.groupBy(engineeringNotebookRubrics.teamId);
			return result;
		}),

	completeEngineeringNotebookRubric: w.procedure.input(EngineeringNotebookRubricSchema).mutation(async ({ ctx, input }) => {
		// insert or update
		await ctx.db
			.insert(engineeringNotebookRubrics)
			.values(input)
			.onConflictDoUpdate({
				target: [engineeringNotebookRubrics.id],
				set: input
			});
	}),

	getEngineeringNotebookRubrics: w.procedure
		.input(z.object({ id: z.uuidv4() }))
		.output(EngineeringNotebookRubricSchema)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.select().from(engineeringNotebookRubrics).where(eq(engineeringNotebookRubrics.id, input.id));
			return result[0] as EngineeringNotebookRubric;
		}),

	completeTeamInterviewRubric: w.procedure.input(TeamInterviewRubricSchema).mutation(async ({ ctx, input }) => {
		// insert or update
		await ctx.db
			.insert(teamInterviewRubrics)
			.values(input)
			.onConflictDoUpdate({
				target: [teamInterviewRubrics.id],
				set: input
			});
	}),

	getTeamInterviewRubrics: w.procedure
		.input(z.object({ id: z.uuidv4() }))
		.output(TeamInterviewRubricSchema)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.select().from(teamInterviewRubrics).where(eq(teamInterviewRubrics.id, input.id));
			return result[0] as TeamInterviewRubric;
		}),

	completeTeamInterviewNote: w.procedure.input(TeamInterviewNoteSchema).mutation(async ({ ctx, input }) => {
		// insert or update
		await ctx.db
			.insert(teamInterviewNotes)
			.values(input)
			.onConflictDoUpdate({
				target: [teamInterviewNotes.id],
				set: input
			});
	}),

	getTeamInterviewNote: w.procedure
		.input(z.object({ id: z.uuidv4() }))
		.output(TeamInterviewNoteSchema)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.select().from(teamInterviewNotes).where(eq(teamInterviewNotes.id, input.id));
			return result[0] as TeamInterviewNote;
		}),

	updateAwardRanking: w.procedure
		.input(z.object({ judgeGroupId: z.uuidv4(), teamId: z.uuidv4(), awardName: AwardNameSchema, ranking: RankSchema }))
		.mutation(async ({ ctx, input }) => {
			// insert or update
			await ctx.db
				.insert(awardRankings)
				.values(input)
				.onConflictDoUpdate({
					target: [awardRankings.judgeGroupId, awardRankings.awardName, awardRankings.teamId],
					set: input
				});
		}),

	// TODO
	// getAwardRankings: w.procedure
	// 	.input(z.object({ judgeGroupId: z.uuidv4() }))
	// 	.output(z.record(AwardNameSchema, z.array(z.uuidv4())))
	// 	.query(async ({ ctx, input }) => {
	// 		const result = await ctx.db.select().from(awardRankings).where(eq(awardRankings.judgeGroupId, input.judgeGroupId));
	// 		const rtn = new Map<string, string[]>();
	// 	}),

	updateJudgeGroupAwardNomination: w.procedure
		.input(z.object({ judgeGroupId: z.uuidv4(), awardName: AwardNameSchema, teamIds: z.array(z.uuidv4()) }))
		.mutation(async ({ ctx, input }) => {
			// remove all existing nominations for the judge group and award, transactionally
			await ctx.db.transaction(async (tx) => {
				await tx
					.delete(judgeGroupAwardNominations)
					.where(
						and(eq(judgeGroupAwardNominations.judgeGroupId, input.judgeGroupId), eq(judgeGroupAwardNominations.awardName, input.awardName))
					);
				await tx.insert(judgeGroupAwardNominations).values(
					input.teamIds.map((teamId) => ({
						judgeGroupId: input.judgeGroupId,
						awardName: input.awardName,
						teamId: teamId
					}))
				);
			});
		}),

	getJudgeGroupAwardNominations: w.procedure
		.input(z.object({ judgeGroupId: z.uuidv4() }))
		.output(z.record(AwardNameSchema, z.array(z.uuidv4())))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.select()
				.from(judgeGroupAwardNominations)
				.where(eq(judgeGroupAwardNominations.judgeGroupId, input.judgeGroupId));
			const rtn = new Map<string, string[]>();
			for (const row of result) {
				if (!rtn.has(row.awardName)) {
					rtn.set(row.awardName, []);
				}
				rtn.get(row.awardName)?.push(row.teamId);
			}
			return Object.fromEntries(rtn.entries());
		}),

	updateFinalAwardRankings: w.procedure
		.input(z.object({ awardName: AwardNameSchema, teamIds: z.array(z.uuidv4()) }))
		.mutation(async ({ ctx, input }) => {
			// remove all existing rankings for the award, transactionally
			await ctx.db.transaction(async (tx) => {
				await tx.delete(finalAwardRankings).where(eq(finalAwardRankings.awardName, input.awardName));
				await tx.insert(finalAwardRankings).values(
					input.teamIds.map((teamId) => ({
						awardName: input.awardName,
						ranking: input.teamIds.indexOf(teamId) + 1,
						teamId: teamId
					}))
				);
			});
		}),

	getFinalAwardRankings: w.procedure.output(z.record(AwardNameSchema, z.array(z.uuidv4()))).query(async ({ ctx }) => {
		const result = await ctx.db.select().from(finalAwardRankings);
		const rtn = new Map<string, string[]>();
		for (const row of result) {
			if (!rtn.has(row.awardName)) {
				rtn.set(row.awardName, []);
			}
			rtn.get(row.awardName)?.push(row.teamId);
		}
		return Object.fromEntries(rtn.entries());
	})
};
}
