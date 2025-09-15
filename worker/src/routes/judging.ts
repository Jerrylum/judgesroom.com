import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import z from 'zod';
import {
	AwardRankingsFullUpdateSchema,
	EngineeringNotebookRubricSchema,
	SubmissionSchema,
	TeamInterviewNoteSchema,
	TeamInterviewRubricSchema
} from '@judging.jerryio/protocol/src/rubric';
import type {
	AwardRankingsFullUpdate,
	EngineeringNotebookRubric,
	TeamInterviewNote,
	TeamInterviewRubric
} from '@judging.jerryio/protocol/src/rubric';
import { eq } from 'drizzle-orm';
import {
	awardRankings,
	awards,
	engineeringNotebookRubrics,
	finalAwardRankings,
	judgeGroupAwardNominations,
	judgeGroupsAssignedTeams,
	teamInterviewNotes,
	teamInterviewRubrics,
	teams
} from '../db/schema';
import { AwardNameSchema } from '@judging.jerryio/protocol/src/award';
import { RankSchema } from '@judging.jerryio/protocol/src/rubric';
import { and } from 'drizzle-orm';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import { broadcastJudgeGroupTopic, subscribeJudgeGroupTopic, unsubscribeJudgeGroupTopic } from './subscriptions';
import { transaction } from '../utils';

export async function getAwardRankings(db: DatabaseOrTransaction, judgeGroupId: string): Promise<AwardRankingsFullUpdate> {
	const { judgedAwards, rankingsData } = await transaction(db, async (tx) => {
		const judgedAwards = (await tx.select().from(awards).where(eq(awards.type, 'judged'))).map((award) => award.name);
		const rankingsData = await tx.select().from(awardRankings).where(eq(awardRankings.judgeGroupId, judgeGroupId));
		return { judgedAwards, rankingsData };
	});

	const allTeams = rankingsData.map((ranking) => ranking.teamId);

	const rankings = allTeams.reduce(
		(acc, teamId) => {
			acc[teamId] = new Array(judgedAwards.length).fill(0);
			return acc;
		},
		{} as Record<string, number[]>
	);

	for (const ranking of rankingsData) {
		rankings[ranking.teamId][judgedAwards.indexOf(ranking.awardName)] = ranking.ranking;
	}

	const rtn: AwardRankingsFullUpdate = {
		judgeGroupId,
		judgedAwards,
		rankings
	};
	return rtn;
}

export function buildJudgingRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getRubricsAndNotes: w.procedure
			.input(z.object({ judgeGroupId: z.uuidv4().optional() }))
			.output(
				z.array(
					z.object({
						teamId: z.uuidv4(),
						engineeringNotebookRubrics: z.array(SubmissionSchema),
						teamInterviewRubrics: z.array(SubmissionSchema),
						teamInterviewNotes: z.array(SubmissionSchema)
					})
				)
			)
			.query(async ({ ctx, input }) => {
				// Import schema tables
				// Get teams based on judge group filter
				let allTeams;
				if (input.judgeGroupId) {
					// Filter teams by judge group assignment
					allTeams = await ctx.db
						.select({ id: teams.id })
						.from(teams)
						.innerJoin(judgeGroupsAssignedTeams, eq(teams.id, judgeGroupsAssignedTeams.teamId))
						.where(eq(judgeGroupsAssignedTeams.judgeGroupId, input.judgeGroupId));
				} else {
					// Get all teams
					allTeams = await ctx.db.select({ id: teams.id }).from(teams);
				}

				// Get all rubrics and notes
				const engineeringRubrics = await ctx.db
					.select({
						id: engineeringNotebookRubrics.id,
						teamId: engineeringNotebookRubrics.teamId,
						judgeId: engineeringNotebookRubrics.judgeId
					})
					.from(engineeringNotebookRubrics);

				const teamRubrics = await ctx.db
					.select({
						id: teamInterviewRubrics.id,
						teamId: teamInterviewRubrics.teamId,
						judgeId: teamInterviewRubrics.judgeId
					})
					.from(teamInterviewRubrics);

				const teamNotes = await ctx.db
					.select({
						id: teamInterviewNotes.id,
						teamId: teamInterviewNotes.teamId,
						judgeId: teamInterviewNotes.judgeId
					})
					.from(teamInterviewNotes);

				// Group by team
				const result = allTeams.map((team) => ({
					teamId: team.id,
					engineeringNotebookRubrics: engineeringRubrics.filter((r) => r.teamId === team.id).map((r) => ({ id: r.id, judgeId: r.judgeId })),
					teamInterviewRubrics: teamRubrics.filter((r) => r.teamId === team.id).map((r) => ({ id: r.id, judgeId: r.judgeId })),
					teamInterviewNotes: teamNotes.filter((r) => r.teamId === team.id).map((r) => ({ id: r.id, judgeId: r.judgeId }))
				}));

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
			.mutation(async ({ ctx, input, session }) => {
				// insert or update
				await ctx.db
					.insert(awardRankings)
					.values(input)
					.onConflictDoUpdate({
						target: [awardRankings.judgeGroupId, awardRankings.awardName, awardRankings.teamId],
						set: input
					});

				broadcastJudgeGroupTopic(ctx.db, input.judgeGroupId, 'awardRankings', session, async (client) =>
					client.onAwardRankingsUpdate.mutation(input)
				);
			}),

		subscribeAwardRankings: w.procedure
			.input(z.object({ judgeGroupIds: z.array(z.uuidv4()), exclusive: z.boolean() }))
			.output(z.array(AwardRankingsFullUpdateSchema))
			.mutation(async ({ ctx, input, session }) => {
				return transaction(ctx.db, async (tx) => {
					await subscribeJudgeGroupTopic(tx, session.currentClient.clientId, input.judgeGroupIds, 'awardRankings', input.exclusive);
					return Promise.all(input.judgeGroupIds.map((judgeGroupId) => getAwardRankings(tx, judgeGroupId)));
				});
			}),

		unsubscribeAwardRankings: w.procedure.mutation(async ({ ctx, session }) => {
			return unsubscribeJudgeGroupTopic(ctx.db, session.currentClient.clientId, 'awardRankings');
		}),

		updateJudgeGroupAwardNomination: w.procedure
			.input(z.object({ judgeGroupId: z.uuidv4(), awardName: AwardNameSchema, teamIds: z.array(z.uuidv4()) }))
			.mutation(async ({ ctx, input }) => {
				// remove all existing nominations for the judge group and award, transactionally
				await ctx.db.transaction(async (tx) => {
					await tx
						.delete(judgeGroupAwardNominations)
						.where(
							and(
								eq(judgeGroupAwardNominations.judgeGroupId, input.judgeGroupId),
								eq(judgeGroupAwardNominations.awardName, input.awardName)
							)
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
