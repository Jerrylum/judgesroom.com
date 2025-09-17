import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import z from 'zod';
import {
	AwardRankingsFullUpdateSchema,
	EngineeringNotebookRubricSchema,
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
	engineeringNotebookRubrics,
	finalAwardRankings,
	judgeGroupAwardNominations,
	judgeGroupsReviewedTeams,
	judgeGroupsSubmissionsCache,
	teamInterviewNotes,
	teamInterviewRubrics
} from '../db/schema';
import { AwardNameSchema } from '@judging.jerryio/protocol/src/award';
import { RankSchema } from '@judging.jerryio/protocol/src/rubric';
import { and } from 'drizzle-orm';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import { broadcastJudgeGroupTopic, subscribeJudgeGroupTopic, unsubscribeJudgeGroupTopic } from './subscriptions';
import { transaction } from '../utils';
import { getAwards } from './essential';

export async function getAwardRankings(db: DatabaseOrTransaction, judgeGroupId: string): Promise<AwardRankingsFullUpdate> {
	const { judgedAwards, rankingsData } = await transaction(db, async (tx) => {
		const judgedAwards = (await getAwards(tx, 'judged'))
			.map((award) => award.name)
			.filter(
				(award) =>
					award !== 'Excellence Award' &&
					award !== 'Excellence Award - High School' &&
					award !== 'Excellence Award - Middle School' &&
					award !== 'Excellence Award - Elementary School'
			);
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

export async function getReviewedTeams(db: DatabaseOrTransaction, judgeGroupId: string): Promise<string[]> {
	const result = await db.select().from(judgeGroupsReviewedTeams).where(eq(judgeGroupsReviewedTeams.judgeGroupId, judgeGroupId));
	return result.map((row) => row.teamId);
}

export async function addReviewedTeam(db: DatabaseOrTransaction, judgeGroupId: string, teamId: string): Promise<boolean> {
	const result = await db.insert(judgeGroupsReviewedTeams).values({ judgeGroupId, teamId }).onConflictDoNothing().returning();
	return result.length > 0;
}

export function buildJudgingRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getRubricsAndNotes: w.procedure
			.input(z.object({ judgeGroupId: z.uuidv4().optional() }))
			.output(
				z.array(
					z.object({
						judgeGroupId: z.uuidv4(),
						teamId: z.uuidv4(),
						judgeId: z.uuidv4(),
						tiId: z.uuidv4().nullable(),
						tnId: z.uuidv4().nullable(),
						enrId: z.uuidv4().nullable()
					})
				)
			)
			.query(async ({ ctx, input }) => {
				if (input.judgeGroupId) {
					return await ctx.db
						.select()
						.from(judgeGroupsSubmissionsCache)
						.where(eq(judgeGroupsSubmissionsCache.judgeGroupId, input.judgeGroupId));
				} else {
					return await ctx.db.select().from(judgeGroupsSubmissionsCache);
				}
			}),

		completeEngineeringNotebookRubric: w.procedure
			.input(
				z.object({
					judgeGroupId: z.uuidv4(),
					submission: EngineeringNotebookRubricSchema
				})
			)
			.mutation(async ({ ctx, input, session }) => {
				// insert or update
				const isReviewedNewTeam = await transaction(ctx.db, async (tx) => {
					await tx
						.insert(engineeringNotebookRubrics)
						.values(input.submission)
						.onConflictDoUpdate({
							target: [engineeringNotebookRubrics.id],
							set: input.submission
						});

					await tx
						.insert(judgeGroupsSubmissionsCache)
						.values({
							judgeGroupId: input.judgeGroupId,
							teamId: input.submission.teamId,
							judgeId: input.submission.judgeId,
							enrId: input.submission.id,
							tiId: null,
							tnId: null
						})
						.onConflictDoUpdate({
							target: [judgeGroupsSubmissionsCache.enrId, judgeGroupsSubmissionsCache.tiId, judgeGroupsSubmissionsCache.tnId],
							set: {
								judgeGroupId: input.judgeGroupId,
								teamId: input.submission.teamId,
								judgeId: input.submission.judgeId
							}
						});

					return await addReviewedTeam(tx, input.judgeGroupId, input.submission.teamId);
				});
				if (isReviewedNewTeam) {
					// Do not wait for the broadcast to complete
					broadcastJudgeGroupTopic(ctx.db, input.judgeGroupId, 'reviewedTeams', session, async (client) =>
						client.onReviewedTeamsUpdate.mutation({ judgeGroupId: input.judgeGroupId, teamId: input.submission.teamId })
					);
				}
			}),

		getEngineeringNotebookRubrics: w.procedure
			.input(z.object({ id: z.uuidv4() }))
			.output(EngineeringNotebookRubricSchema)
			.query(async ({ ctx, input }) => {
				const result = await ctx.db.select().from(engineeringNotebookRubrics).where(eq(engineeringNotebookRubrics.id, input.id));
				return result[0] as EngineeringNotebookRubric;
			}),

		completeTeamInterviewRubric: w.procedure
			.input(
				z.object({
					judgeGroupId: z.uuidv4(),
					submission: TeamInterviewRubricSchema
				})
			)
			.mutation(async ({ ctx, input, session }) => {
				const isReviewedNewTeam = await transaction(ctx.db, async (tx) => {
					await tx
						.insert(teamInterviewRubrics)
						.values(input.submission)
						.onConflictDoUpdate({
							target: [teamInterviewRubrics.id],
							set: input.submission
						});
					await tx
						.insert(judgeGroupsSubmissionsCache)
						.values({
							judgeGroupId: input.judgeGroupId,
							teamId: input.submission.teamId,
							judgeId: input.submission.judgeId,
							enrId: null,
							tiId: input.submission.id,
							tnId: null
						})
						.onConflictDoUpdate({
							target: [judgeGroupsSubmissionsCache.enrId, judgeGroupsSubmissionsCache.tiId, judgeGroupsSubmissionsCache.tnId],
							set: {
								judgeGroupId: input.judgeGroupId,
								teamId: input.submission.teamId,
								judgeId: input.submission.judgeId
							}
						});
					return await addReviewedTeam(tx, input.judgeGroupId, input.submission.teamId);
				});
				if (isReviewedNewTeam) {
					// Do not wait for the broadcast to complete
					broadcastJudgeGroupTopic(ctx.db, input.judgeGroupId, 'reviewedTeams', session, async (client) =>
						client.onReviewedTeamsUpdate.mutation({ judgeGroupId: input.judgeGroupId, teamId: input.submission.teamId })
					);
				}
			}),

		getTeamInterviewRubrics: w.procedure
			.input(z.object({ id: z.uuidv4() }))
			.output(TeamInterviewRubricSchema)
			.query(async ({ ctx, input }) => {
				const result = await ctx.db.select().from(teamInterviewRubrics).where(eq(teamInterviewRubrics.id, input.id));
				return result[0] as TeamInterviewRubric;
			}),

		completeTeamInterviewNote: w.procedure
			.input(
				z.object({
					judgeGroupId: z.uuidv4(),
					submission: TeamInterviewNoteSchema
				})
			)
			.mutation(async ({ ctx, input, session }) => {
				const isReviewedNewTeam = await transaction(ctx.db, async (tx) => {
					await tx
						.insert(teamInterviewNotes)
						.values(input.submission)
						.onConflictDoUpdate({
							target: [teamInterviewNotes.id],
							set: input.submission
						});
					await tx
						.insert(judgeGroupsSubmissionsCache)
						.values({
							judgeGroupId: input.judgeGroupId,
							teamId: input.submission.teamId,
							judgeId: input.submission.judgeId,
							tiId: input.submission.id,
							tnId: null,
							enrId: null
						})
						.onConflictDoUpdate({
							target: [judgeGroupsSubmissionsCache.enrId, judgeGroupsSubmissionsCache.tiId, judgeGroupsSubmissionsCache.tnId],
							set: {
								judgeGroupId: input.judgeGroupId,
								teamId: input.submission.teamId,
								judgeId: input.submission.judgeId
							}
						});
					return await addReviewedTeam(tx, input.judgeGroupId, input.submission.teamId);
				});
				if (isReviewedNewTeam) {
					// Do not wait for the broadcast to complete
					broadcastJudgeGroupTopic(ctx.db, input.judgeGroupId, 'reviewedTeams', session, async (client) =>
						client.onReviewedTeamsUpdate.mutation({ judgeGroupId: input.judgeGroupId, teamId: input.submission.teamId })
					);
				}
			}),

		getTeamInterviewNote: w.procedure
			.input(z.object({ id: z.uuidv4() }))
			.output(TeamInterviewNoteSchema)
			.query(async ({ ctx, input }) => {
				const result = await ctx.db.select().from(teamInterviewNotes).where(eq(teamInterviewNotes.id, input.id));
				return result[0] as TeamInterviewNote;
			}),

		subscribeReviewedTeams: w.procedure
			.input(z.object({ judgeGroupIds: z.array(z.uuidv4()), exclusive: z.boolean() }))
			.output(z.array(z.object({ judgeGroupId: z.uuidv4(), teamIds: z.array(z.uuidv4()) })))
			.mutation(async ({ ctx, input, session }) => {
				return transaction(ctx.db, async (tx) => {
					await subscribeJudgeGroupTopic(tx, session.currentClient.clientId, input.judgeGroupIds, 'reviewedTeams', input.exclusive);
					return Promise.all(
						input.judgeGroupIds.map(async (judgeGroupId) => ({
							judgeGroupId,
							teamIds: await getReviewedTeams(tx, judgeGroupId)
						}))
					);
				});
			}),

		unsubscribeReviewedTeams: w.procedure.mutation(async ({ ctx, session }) => {
			return unsubscribeJudgeGroupTopic(ctx.db, session.currentClient.clientId, 'reviewedTeams');
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
