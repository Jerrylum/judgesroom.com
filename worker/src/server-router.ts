import { z } from 'zod';
import { Award, AwardNameSchema, AwardSchema, AwardTypeSchema } from '@judging.jerryio/protocol/src/award';
import { TeamInfoSchema, TeamNumberSchema } from '@judging.jerryio/protocol/src/team';
import {
	EngineeringNotebookRubric,
	EngineeringNotebookRubricSchema,
	RankSchema,
	TeamInterviewNote,
	TeamInterviewNoteSchema,
	TeamInterviewRubric,
	TeamInterviewRubricSchema
} from '@judging.jerryio/protocol/src/rubric';
import { Judge, JudgeGroup, JudgeGroupSchema, JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import { initWRPC } from '@judging.jerryio/wrpc/server';
import { type ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
	awardRankings,
	awards,
	engineeringNotebookRubrics,
	finalAwardRankings,
	judgeGroupAwardNominations,
	judgeGroups,
	judgeGroupsAssignedTeams,
	judges,
	teamInterviewNotes,
	teamInterviewRubrics,
	teams
} from './db/schema';

export interface ServerContext {
	db: DrizzleSqliteDODatabase;
}

// Initialize WRPC server
const w = initWRPC.createServer<ServerContext>();

/*
TODO, for human:

- createSession
- joinSession
- destorySession
- kickClient
*/

/**
 * Server router defines procedures that clients can call
 * These are the API endpoints available to connected clients
 */
const serverRouter = w.router({
	getAwards: w.procedure
		.input(z.object({ type: AwardTypeSchema.optional() }))
		.output(z.array(AwardSchema))
		.query(async ({ ctx, input }) => {
			// JERRY: explicit type definition is needed to cast acceptedGrades from unknown to AwardType[]
			if (input.type) {
				return ctx.db.select().from(awards).where(eq(awards.type, input.type)) as Promise<Award[]>;
			} else {
				return ctx.db.select().from(awards) as Promise<Award[]>;
			}
		}),

	getTeamInfo: w.procedure
		.input(z.object({ group: z.string().optional() }))
		.output(z.array(TeamInfoSchema))
		.query(async ({ ctx, input }) => {
			const neededColumns = {
				id: teams.id,
				number: teams.number,
				name: teams.name,
				city: teams.city,
				state: teams.state,
				country: teams.country,
				shortName: teams.shortName,
				school: teams.school,
				grade: teams.grade,
				group: teams.group
			};
			if (input.group) {
				return ctx.db.select(neededColumns).from(teams).where(eq(teams.group, input.group));
			} else {
				return ctx.db.select(neededColumns).from(teams);
			}
		}),

	getJudgeGroups: w.procedure.output(z.array(JudgeGroupSchema)).query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({ id: judgeGroups.id, name: judgeGroups.name, teamNumber: teams.number })
			.from(judgeGroups)
			.leftJoin(judgeGroupsAssignedTeams, eq(judgeGroupsAssignedTeams.judgeGroupId, judgeGroups.id))
			.leftJoin(teams, eq(teams.id, judgeGroupsAssignedTeams.teamId));

		const groupsMap = new Map<string, JudgeGroup>();
		for (const row of rows) {
			let group = groupsMap.get(row.id);
			if (!group) {
				group = { id: row.id, name: row.name, assignedTeams: [] };
				groupsMap.set(row.id, group);
			}
			if (row.teamNumber) {
				group.assignedTeams.push(row.teamNumber);
			}
		}
		return Array.from(groupsMap.values());
	}),

	getJudges: w.procedure.output(z.array(JudgeSchema)).query(async ({ ctx }) => {
		// JERRY: explicit type definition is needed to cast groupId from string to uuidv4
		return ctx.db.select().from(judges) as Promise<Judge[]>;
	}),

	updateJudge: w.procedure.input(JudgeSchema).mutation(async ({ ctx, input }) => {
		// update or insert
		await ctx.db
			.insert(judges)
			.values(input)
			.onConflictDoUpdate({
				target: [judges.id],
				set: input
			});
	}),

	removeJudge: w.procedure
		.input(z.object({ id: z.uuidv4() }))
		.output(z.boolean())
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db.delete(judges).where(eq(judges.id, input.id));
			return result.rowsWritten !== 0;
		}),

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

	// These are examples of procedures:
	// /**
	//  * Simple query that returns a greeting
	//  */
	// getName: w.procedure.input(z.string()).query(async ({ input, ctx }) => {
	// 	console.log('👋 Server getName called with:', input);
	// 	return `Hello from server, ${input}!`;
	// }),
	// /**
	//  * Returns the current server time
	//  */
	// getServerTime: w.procedure.query(async () => {
	// 	return new Date().toISOString();
	// }),
	// /**
	//  * Sets age and demonstrates server-to-client communication
	//  */
	// setAge: w.procedure.input(z.number()).mutation(async ({ input, session }) => {
	// 	console.log('🎂 Server setAge called with:', input);
	// 	// Broadcast age update to all connected clients
	// 	await session.broadcast<ClientRouter>().updateAge.mutation(input);
	// 	return `Server: You are ${input} years old! Update sent to all clients.`;
	// }),
	// /**
	//  * Send notification to all clients
	//  */
	// broadcastNotification: w.procedure.input(z.string()).mutation(async ({ input, session }) => {
	// 	console.log('📢 Broadcasting notification:', input);
	// 	const broadcast = session.broadcast<ClientRouter>();
	// 	// explicit type definition is needed to suppress circularly references error ts(2456)
	// 	const allResult: string[] = await broadcast.receiveNotification.mutation(input);
	// 	return `Notification "${input}" sent to all clients. They responded: ${allResult.join(', ')}`;
	// }),
	// /**
	//  * Get a personalized message from a specific client
	//  */
	// getClientGreeting: w.procedure
	// 	.input(
	// 		z.object({
	// 			clientId: z.string(),
	// 			message: z.string()
	// 		})
	// 	)
	// 	.mutation(async ({ input, session }: { input: { clientId: string; message: string }; session: Session<never> }): Promise<string> => {
	// 		console.log('💬 Getting greeting from client:', input.clientId);
	// 		try {
	// 			const response: string = await session.getClient<ClientRouter>(input.clientId).getPersonalGreeting.query(input.message);
	// 			return `Client ${input.clientId} responded: ${response}`;
	// 		} catch (error) {
	// 			return `Failed to get greeting from client ${input.clientId}: ${error}`;
	// 		}
	// 	})
});

export { serverRouter };

/**
 * Type definition for the server router
 * Used by client-side code to get type-safe server procedure calls
 */
export type ServerRouter = typeof serverRouter;
