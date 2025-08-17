import { z } from 'zod';
import type { Award } from '@judging.jerryio/protocol/src/award';
import { AwardNameSchema, AwardSchema, AwardTypeSchema, CompetitionTypeSchema } from '@judging.jerryio/protocol/src/award';
import { TeamInfoSchema, TeamNumberSchema } from '@judging.jerryio/protocol/src/team';
import { EssentialDataSchema, EventGradeLevelSchema, EventNameSchema, type EssentialData } from '@judging.jerryio/protocol/src/event';
import { ClientInfoSchema, SessionInfoSchema, type ClientInfo, type SessionInfo } from '@judging.jerryio/protocol/src/client';
import type { EngineeringNotebookRubric, TeamInterviewNote, TeamInterviewRubric } from '@judging.jerryio/protocol/src/rubric';
import {
	EngineeringNotebookRubricSchema,
	RankSchema,
	TeamInterviewNoteSchema,
	TeamInterviewRubricSchema
} from '@judging.jerryio/protocol/src/rubric';
import type { Judge, JudgeGroup } from '@judging.jerryio/protocol/src/judging';
import { JudgeGroupSchema, JudgeSchema, JudgingMethodSchema } from '@judging.jerryio/protocol/src/judging';
import { initWRPC } from '@judging.jerryio/wrpc/server';
import { type ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
	awardRankings,
	awards,
	engineeringNotebookRubrics,
	essential,
	finalAwardNominations,
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
	// Note: Network access would be added here in a full implementation
	// network: Network;
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
	// ============================================================================
	// Essential Data Management
	// ============================================================================

	getEssentialData: w.procedure.output(EssentialDataSchema).query(async ({ ctx }) => {
		// Get essential info
		const essentialRow = await ctx.db.select().from(essential).limit(1);
		if (essentialRow.length === 0) {
			throw new Error('No essential data found. Session may not be initialized.');
		}
		const essentialInfo = essentialRow[0];

		// Get all awards grouped by type
		const allAwards = (await ctx.db.select().from(awards)) as Award[];
		const performanceAwards = allAwards.filter((a) => a.type === 'performance') as Array<Award & { type: 'performance' }>;
		const judgedAwards = allAwards.filter((a) => a.type === 'judged') as Array<Award & { type: 'judged' }>;
		const volunteerNominatedAwards = allAwards.filter((a) => a.type === 'volunteer_nominated') as Array<
			Award & { type: 'volunteer_nominated' }
		>;

		// Get all teams (with nested data structure)
		const rawTeamsData = await ctx.db
			.select({
				id: teams.id,
				number: teams.number,
				name: teams.name,
				city: teams.city,
				state: teams.state,
				country: teams.country,
				shortName: teams.shortName,
				school: teams.school,
				grade: teams.grade,
				group: teams.group,
				notebookLink: teams.notebookLink,
				excluded: teams.excluded
			})
			.from(teams);

		// Transform to nested structure
		const teamsData = rawTeamsData.map(team => ({
			id: team.id,
			number: team.number,
			name: team.name,
			city: team.city,
			state: team.state,
			country: team.country,
			shortName: team.shortName,
			school: team.school,
			grade: team.grade,
			group: team.group,
			data: {
				notebookLink: team.notebookLink,
				excluded: team.excluded
			}
		}));

		// Get judge groups with assigned teams
		const judgeGroupsData = await ctx.db
			.select({ id: judgeGroups.id, name: judgeGroups.name, teamNumber: teams.number })
			.from(judgeGroups)
			.leftJoin(judgeGroupsAssignedTeams, eq(judgeGroupsAssignedTeams.judgeGroupId, judgeGroups.id))
			.leftJoin(teams, eq(teams.id, judgeGroupsAssignedTeams.teamId));

		const groupsMap = new Map<string, JudgeGroup>();
		for (const row of judgeGroupsData) {
			let group = groupsMap.get(row.id);
			if (!group) {
				group = { id: row.id, name: row.name, assignedTeams: [] };
				groupsMap.set(row.id, group);
			}
			if (row.teamNumber) {
				group.assignedTeams.push(row.teamNumber);
			}
		}

		const essentialData: EssentialData = {
			eventName: essentialInfo.eventName,
			competitionType: essentialInfo.competitionType,
			eventGradeLevel: essentialInfo.eventGradeLevel,
			performanceAwards,
			judgedAwards,
			volunteerNominatedAwards,
			teams: teamsData,
			judgingMethod: essentialInfo.judgingMethod,
			judgeGroups: Array.from(groupsMap.values())
		};

		return essentialData;
	}),

	updateEssentialData: w.procedure.input(EssentialDataSchema).mutation(async ({ ctx, input, session }) => {
		await ctx.db.transaction(async (tx) => {
			// Step 1: Update essential info (safe - no cascades)
			await tx.delete(essential);
			await tx.insert(essential).values({
				eventName: input.eventName,
				competitionType: input.competitionType,
				eventGradeLevel: input.eventGradeLevel,
				judgingMethod: input.judgingMethod
			});

			// Step 2: Get existing data for comparison
			const existingAwards = await tx.select().from(awards);
			const existingTeams = await tx.select().from(teams);
			const existingJudgeGroups = await tx.select().from(judgeGroups);
			const existingAssignments = await tx.select().from(judgeGroupsAssignedTeams);

			// Step 3: Incremental update awards
			const allNewAwards = [...input.performanceAwards, ...input.judgedAwards, ...input.volunteerNominatedAwards];

			const existingAwardNames = new Set(existingAwards.map((a) => a.name));
			const newAwardNames = new Set(allNewAwards.map((a) => a.name));

			// Delete awards that no longer exist
			const awardsToDelete = existingAwards.filter((a) => !newAwardNames.has(a.name));
			for (const award of awardsToDelete) {
				await tx.delete(awards).where(eq(awards.name, award.name));
			}

			// Insert new awards and update existing ones
			for (const newAward of allNewAwards) {
				const existingAward = existingAwards.find((a) => a.name === newAward.name);
				if (existingAward) {
					// Check if award needs updating
					const needsUpdate =
						existingAward.type !== newAward.type ||
						JSON.stringify(existingAward.acceptedGrades) !== JSON.stringify(newAward.acceptedGrades) ||
						existingAward.winnersCount !== newAward.winnersCount ||
						existingAward.requireNotebook !== newAward.requireNotebook;

					if (needsUpdate) {
						await tx
							.update(awards)
							.set({
								type: newAward.type,
								acceptedGrades: newAward.acceptedGrades,
								winnersCount: newAward.winnersCount,
								requireNotebook: newAward.requireNotebook
							})
							.where(eq(awards.name, newAward.name));
					}
				} else {
					// Insert new award
					await tx.insert(awards).values(newAward);
				}
			}

			// Step 4: Incremental update teams
			const existingTeamNumbers = new Set(existingTeams.map((t) => t.number));
			const newTeamNumbers = new Set(input.teams.map((t) => t.number));

			// Delete teams that no longer exist (this will cascade delete related data)
			const teamsToDelete = existingTeams.filter((t) => !newTeamNumbers.has(t.number));
			for (const team of teamsToDelete) {
				await tx.delete(teams).where(eq(teams.id, team.id));
			}

			// Insert new teams and update existing ones
			for (const newTeam of input.teams) {
				const existingTeam = existingTeams.find((t) => t.number === newTeam.number);
				if (existingTeam) {
					// Check if team needs updating (preserve notebookLink and excluded)
					const needsUpdate =
						existingTeam.name !== newTeam.name ||
						existingTeam.city !== newTeam.city ||
						existingTeam.state !== newTeam.state ||
						existingTeam.country !== newTeam.country ||
						existingTeam.shortName !== newTeam.shortName ||
						existingTeam.school !== newTeam.school ||
						existingTeam.grade !== newTeam.grade ||
						existingTeam.group !== newTeam.group;

					if (needsUpdate) {
						await tx
							.update(teams)
							.set({
								name: newTeam.name,
								city: newTeam.city,
								state: newTeam.state,
								country: newTeam.country,
								shortName: newTeam.shortName,
								school: newTeam.school,
								grade: newTeam.grade,
								group: newTeam.group
								// Preserve notebookLink and excluded
							})
							.where(eq(teams.id, existingTeam.id));
					}
				} else {
					// Insert new team
					await tx.insert(teams).values({
						...newTeam,
						notebookLink: '',
						excluded: false
					});
				}
			}

			// Step 5: Incremental update judge groups
			const existingGroupNames = new Set(existingJudgeGroups.map((g) => g.name));
			const newGroupNames = new Set(input.judgeGroups.map((g) => g.name));

			// Delete judge groups that no longer exist (this will cascade delete related data)
			const groupsToDelete = existingJudgeGroups.filter((g) => !newGroupNames.has(g.name));
			for (const group of groupsToDelete) {
				await tx.delete(judgeGroups).where(eq(judgeGroups.id, group.id));
			}

			// Insert new judge groups and update existing ones
			for (const newGroup of input.judgeGroups) {
				const existingGroup = existingJudgeGroups.find((g) => g.name === newGroup.name);
				if (existingGroup) {
					// Update group name if needed (though name is the key, this handles edge cases)
					if (existingGroup.name !== newGroup.name) {
						await tx.update(judgeGroups).set({ name: newGroup.name }).where(eq(judgeGroups.id, existingGroup.id));
					}

					// Use existing group ID for assignments
					newGroup.id = existingGroup.id;
				} else {
					// Insert new judge group
					await tx.insert(judgeGroups).values({
						id: newGroup.id,
						name: newGroup.name
					});
				}
			}

			// Step 6: Incremental update team assignments
			// Get current teams after updates to use correct IDs
			const updatedTeams = await tx.select().from(teams);

			// Delete all existing assignments for groups that still exist
			const remainingGroupIds = input.judgeGroups.map((g) => g.id);
			if (remainingGroupIds.length > 0) {
				await tx
					.delete(judgeGroupsAssignedTeams)
					.where(sql`${judgeGroupsAssignedTeams.judgeGroupId} IN (${remainingGroupIds.map((id) => `'${id}'`).join(',')})`);
			}

			// Insert new assignments
			const newAssignments = [];
			for (const group of input.judgeGroups) {
				for (const teamNumber of group.assignedTeams) {
					const team = updatedTeams.find((t) => t.number === teamNumber);
					if (team) {
						newAssignments.push({
							judgeGroupId: group.id,
							teamId: team.id
						});
					}
				}
			}

			if (newAssignments.length > 0) {
				await tx.insert(judgeGroupsAssignedTeams).values(newAssignments);
			}

			// Step 7: Update judge group assignments for existing judges
			// Judges will automatically follow their groups due to the preserved group IDs
			// No additional action needed - existing judges remain in their groups
		});

		// Broadcast update to all clients
		await session.broadcast<ClientRouter>().onEssentialDataUpdate.mutation(input);
	}),

	seedInitialData: w.procedure
		.input(
			z.object({
				eventName: EventNameSchema,
				competitionType: CompetitionTypeSchema,
				eventGradeLevel: EventGradeLevelSchema,
				judgingMethod: JudgingMethodSchema
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Insert basic essential data
			await ctx.db.insert(essential).values({
				eventName: input.eventName,
				competitionType: input.competitionType,
				eventGradeLevel: input.eventGradeLevel,
				judgingMethod: input.judgingMethod
			});

			// Create a default judge group
			const defaultJudgeGroupId = crypto.randomUUID();
			await ctx.db.insert(judgeGroups).values({
				id: defaultJudgeGroupId,
				name: 'Default Group'
			});
		}),

	// ============================================================================
	// Session Management
	// ============================================================================

	createSession: w.procedure
		.input(
			z.object({
				eventName: EventNameSchema,
				competitionType: CompetitionTypeSchema,
				eventGradeLevel: EventGradeLevelSchema,
				judgingMethod: JudgingMethodSchema
			})
		)
		.output(z.object({ sessionId: z.string() }))
		.mutation(async ({ ctx, input, session }) => {
			const sessionId = session.sessionId;

			// Clear any existing data and seed the initial data
			await ctx.db.delete(essential);
			await ctx.db.insert(essential).values({
				eventName: input.eventName,
				competitionType: input.competitionType,
				eventGradeLevel: input.eventGradeLevel,
				judgingMethod: input.judgingMethod
			});

			// Create a default judge group
			const defaultJudgeGroupId = crypto.randomUUID();
			await ctx.db.insert(judgeGroups).values({
				id: defaultJudgeGroupId,
				name: 'Default Group'
			});

			return { sessionId };
		}),

	joinSession: w.procedure
		.input(z.object({ sessionId: z.string() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ input, session }) => {
			// In a real implementation, you would validate the session ID
			// For now, we'll just check if the current session matches
			const currentSessionId = session.sessionId;
			if (currentSessionId !== input.sessionId) {
				throw new Error('Invalid session ID');
			}
			return { success: true };
		}),

	getSessionInfo: w.procedure.output(SessionInfoSchema).query(async ({ session }) => {
		const sessionId = session.sessionId;
		const createdAt = Date.now(); // In real implementation, store this in DB

		const sessionInfo: SessionInfo = {
			sessionId,
			createdAt,
			clientId: session.currentClient.clientId,
			deviceName: session.currentClient.deviceName
		};

		return sessionInfo;
	}),

	getClients: w.procedure.output(z.array(ClientInfoSchema)).query(async ({ session }) => {
		// For now, return basic client info based on current session
		// In a full implementation, this would use ctx.network.getConnectedClients()
		const clientInfos: ClientInfo[] = [
			{
				clientId: session.currentClient.clientId,
				deviceName: session.currentClient.deviceName,
				connectedAt: Date.now(),
				isOnline: true
			}
		];

		return clientInfos;
	}),

	kickClient: w.procedure
		.input(z.object({ clientId: z.string() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ input }) => {
			// TODO: Implement when WRPC supports session.kickClient
			// This should use session.kickClient(input.clientId) when available
			return { success: false };
		}),

	// ============================================================================
	// Existing Procedures
	// ============================================================================

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
