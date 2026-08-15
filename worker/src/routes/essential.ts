import type { EssentialData } from '@judgesroom.com/protocol/src/event';
import { EssentialDataSchema } from '@judgesroom.com/protocol/src/event';
import { awards, judgeGroups, judgeGroupsAssignedTeams, judgeGroupsSubmissionsCache, metadata, teams } from '../db/schema';
import type { DatabaseOrTransaction, ServerContext, Transaction } from '../server-router';
import type { Award, AwardType } from '@judgesroom.com/protocol/src/award';
import { desc, eq, getTableColumns, ne, sql, SQL } from 'drizzle-orm';
import type { TeamInfo } from '@judgesroom.com/protocol/src/team';
import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';
import { ReassignTeamInputSchema } from '@judgesroom.com/protocol/src/judging';
import type { SubmissionCache } from '@judgesroom.com/protocol/src/rubric';
import type { SQLiteInsertValue, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { ClientRouter } from '../client-router';
import type { WRPCRootObject } from '@jerrylum/wrpc/server';
import { transaction } from '../utils';
import { getFinalAwardNominations } from './judging';
import { getTeamData } from './team';
import { getJudges } from './judge';
import { generateAuthToken, uncontrolledAuthentication } from '@judgesroom.com/protocol/src/access';
import { assertAuthenticatedJudgeAdvisor, upsertJudgeAdvisorAuthToken } from '../access/tokens';
import type { RoomState } from './handshake';
import { broadcastDeviceListUpdate } from './device';
import { broadcastTopic, type ClientSource } from './subscriptions';

/**
 * Result of moving a team between judge groups.
 * Reviewed teams, award rankings, and final nomination judgeGroupId are intentionally
 * left on the old group — the team may still appear on that group's reviewed∪ranking boards.
 */
export type ReassignTeamResult = {
	movedCaches: SubmissionCache[];
	didReassign: boolean;
};

/** Procedure session: room broadcast + ClientSource for topic fanout. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReassignBroadcastSession = ClientSource & { broadcast: any };

const emptyReassignResult: ReassignTeamResult = {
	movedCaches: [],
	didReassign: false
};

export async function getAwards(db: DatabaseOrTransaction, type?: AwardType): Promise<Award[]> {
	// JERRY: explicit type definition is needed to cast acceptedGrades from unknown to AwardType[]
	if (type) {
		return db.select().from(awards).where(eq(awards.type, type)).orderBy(awards.position) as Promise<Award[]>;
	}
	return db.select().from(awards).orderBy(awards.position) as Promise<Award[]>;
}

export async function getTeamInfos(db: DatabaseOrTransaction, group?: string): Promise<TeamInfo[]> {
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
	if (group) {
		return db.select(neededColumns).from(teams).where(eq(teams.group, group));
	} else {
		return db.select(neededColumns).from(teams);
	}
}

export async function getJudgeGroups(db: DatabaseOrTransaction): Promise<JudgeGroup[]> {
	const rows = await db
		.select({ id: judgeGroups.id, name: judgeGroups.name, teamId: teams.id, order: judgeGroupsAssignedTeams.order })
		.from(judgeGroups)
		.leftJoin(judgeGroupsAssignedTeams, eq(judgeGroupsAssignedTeams.judgeGroupId, judgeGroups.id))
		.leftJoin(teams, eq(teams.id, judgeGroupsAssignedTeams.teamId))
		.orderBy(judgeGroupsAssignedTeams.order);

	const groupsMap = new Map<string, JudgeGroup>();
	for (const row of rows) {
		let group = groupsMap.get(row.id);
		if (!group) {
			group = { id: row.id, name: row.name, assignedTeams: [] };
			groupsMap.set(row.id, group);
		}
		if (row.teamId) {
			group.assignedTeams.push(row.teamId);
		}
	}
	return Array.from(groupsMap.values());
}

export async function hasEssentialData(db: DatabaseOrTransaction): Promise<boolean> {
	const metadataRows = await db.select().from(metadata).limit(1);
	return metadataRows.length > 0;
}

export async function getEssentialData(db: DatabaseOrTransaction): Promise<EssentialData> {
	return transaction(db, async (tx) => {
		const metadataRows = await tx.select().from(metadata).limit(1);
		if (metadataRows.length === 0) {
			throw new Error('No metadata found');
		}

		return {
			robotEventsSku: metadataRows[0].robotEventsSku,
			robotEventsEventId: metadataRows[0].robotEventsEventId,
			divisionId: metadataRows[0].divisionId,
			eventName: metadataRows[0].eventName,
			program: metadataRows[0].program,
			eventGradeLevel: metadataRows[0].eventGradeLevel,
			judgingMethod: metadataRows[0].judgingMethod,
			judgingStep: metadataRows[0].judgingStep,
			accessControlEnabled: metadataRows[0].accessControlEnabled,
			awards: await getAwards(tx),
			teamInfos: await getTeamInfos(tx),
			judgeGroups: await getJudgeGroups(tx)
		};
	});
}

export async function reassignTeamInTx(tx: Transaction, teamId: string, toJudgeGroupId: string): Promise<ReassignTeamResult> {
	const [maxOrderRow] = await tx
		.select({ order: judgeGroupsAssignedTeams.order })
		.from(judgeGroupsAssignedTeams)
		.orderBy(desc(judgeGroupsAssignedTeams.order))
		.limit(1);
	const nextOrder = (maxOrderRow?.order ?? -1) + 1;

	// Upsert assignment. setWhere skips the update when already in the target group
	// (RETURNING empty ⇒ no-op). Invalid team/group ids fail via FK.
	const upserted = await tx
		.insert(judgeGroupsAssignedTeams)
		.values({
			teamId,
			judgeGroupId: toJudgeGroupId,
			order: nextOrder
		})
		.onConflictDoUpdate({
			target: [judgeGroupsAssignedTeams.teamId],
			set: {
				judgeGroupId: toJudgeGroupId,
				order: nextOrder
			},
			setWhere: ne(judgeGroupsAssignedTeams.judgeGroupId, toJudgeGroupId)
		})
		.returning({ teamId: judgeGroupsAssignedTeams.teamId });

	if (upserted.length === 0) {
		return emptyReassignResult;
	}

	const movedCaches = (await tx
		.update(judgeGroupsSubmissionsCache)
		.set({ judgeGroupId: toJudgeGroupId })
		.where(eq(judgeGroupsSubmissionsCache.teamId, teamId))
		.returning()) satisfies SubmissionCache[];

	return {
		movedCaches,
		didReassign: true
	};
}

export async function reassignTeam(db: DatabaseOrTransaction, teamId: string, toJudgeGroupId: string): Promise<ReassignTeamResult> {
	return transaction(db, async (tx) => reassignTeamInTx(tx, teamId, toJudgeGroupId));
}

export function broadcastReassignUpdate(
	db: DatabaseOrTransaction,
	session: ReassignBroadcastSession,
	result: ReassignTeamResult
): void {
	if (!result.didReassign) return;

	void getJudgeGroups(db).then((groups) => {
		const assignments = Object.fromEntries(groups.map((group) => [group.id, group.assignedTeams]));
		session.broadcast().onReassignTeams.mutation(assignments);
	});

	if (result.movedCaches.length > 0) {
		void broadcastTopic(db, 'submissions', session, async (client) =>
			client.onSubmissionCacheUpdate.mutation(result.movedCaches)
		);
	}
}

export async function updateEssentialData(db: DatabaseOrTransaction, essentialData: EssentialData): Promise<void> {
	const buildConflictUpdateColumns = <T extends SQLiteTable, Q extends keyof T['_']['columns']>(table: T, columns: Q[]) => {
		const cls = getTableColumns(table);
		return columns.reduce(
			(acc, column) => {
				const colName = cls[column].name;
				acc[column] = sql.raw(`excluded.${colName}`);
				return acc;
			},
			{} as Record<Q, SQL>
		);
	};

	async function updateInsertAndDeleteAwards(tx: DatabaseOrTransaction, values: Award[]) {
		type AwardInDB = SQLiteInsertValue<typeof awards>;

		const valuesInDB = values.map((v, i) => ({ ...v, position: i }));

		// Use for loop instead of bulk insert/delete to avoid SQLite error
		// See: https://github.com/drizzle-team/drizzle-orm/issues/2479
		const allAwards = await tx.select().from(awards);
		for (const v of allAwards) {
			if (!valuesInDB.some((v2) => v2.name === v.name)) {
				await tx.delete(awards).where(eq(awards.name, v.name));
			}
		}

		for (const v of valuesInDB) {
			await tx
				.insert(awards)
				.values(v)
				.onConflictDoUpdate({
					target: [awards.name],
					set: buildConflictUpdateColumns(awards, Object.keys(v) as (keyof AwardInDB)[])
				});
		}
	}

	async function updateInsertAndDeleteTeams(tx: DatabaseOrTransaction, values: TeamInfo[]) {
		// Use for loop instead of bulk insert/delete to avoid SQLite error
		// See: https://github.com/drizzle-team/drizzle-orm/issues/2479
		const allTeams = await tx.select().from(teams);
		for (const v of allTeams) {
			if (!values.some((v2) => v2.id === v.id)) {
				await tx.delete(teams).where(eq(teams.id, v.id));
			}
		}

		for (const v of values) {
			await tx
				.insert(teams)
				.values(v)
				.onConflictDoUpdate({
					target: [teams.id],
					set: buildConflictUpdateColumns(teams, Object.keys(v) as (keyof TeamInfo)[])
				});
		}
	}

	async function updateInsertAndDeleteJudgeGroups(tx: DatabaseOrTransaction, values: JudgeGroup[]) {
		// Use for loop instead of bulk insert/delete to avoid SQLite error
		// See: https://github.com/drizzle-team/drizzle-orm/issues/2479
		const allJudgeGroups = await tx.select().from(judgeGroups);
		for (const v of allJudgeGroups) {
			if (!values.some((v2) => v2.id === v.id)) {
				await tx.delete(judgeGroups).where(eq(judgeGroups.id, v.id));
			}
		}

		for (const v of values) {
			await tx
				.insert(judgeGroups)
				.values(v)
				.onConflictDoUpdate({
					target: [judgeGroups.id],
					set: buildConflictUpdateColumns(judgeGroups, ['id', 'name'])
				});
		}

		const assignedTeams = values.flatMap((v) => v.assignedTeams.map((t) => ({ judgeGroupId: v.id, teamId: t })));

		await tx.delete(judgeGroupsAssignedTeams);

		// for (const v of assignedTeams) {
		// 	await tx.insert(judgeGroupsAssignedTeams).values(v);
		// }
		for (let i = 0; i < assignedTeams.length; i++) {
			await tx.insert(judgeGroupsAssignedTeams).values({ ...assignedTeams[i], order: i });
		}
	}

	// DISCUSS: Should we update cache?

	return transaction(db, async (tx) => {
		await tx.delete(metadata);
		await tx.insert(metadata).values({ ...essentialData, updatedAt: new Date() });
		await updateInsertAndDeleteAwards(tx, essentialData.awards);
		await updateInsertAndDeleteTeams(tx, essentialData.teamInfos);
		await updateInsertAndDeleteJudgeGroups(tx, essentialData.judgeGroups);
	});
}

export function buildEssentialRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		reassignTeam: w.procedure.input(ReassignTeamInputSchema).mutation(async ({ ctx, input, session }) => {
			if (ctx.auth.isAuthenticated()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			const result = await reassignTeam(ctx.db, input.teamId, input.toJudgeGroupId);
			broadcastReassignUpdate(ctx.db, session, result);
		}),
		updateEssentialData: w.procedure.input(EssentialDataSchema).mutation(async ({ ctx, input, session }) => {
			const wasAccessControlEnabled = await ctx.network.isAccessControlEnabled();
			if (wasAccessControlEnabled) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			if (wasAccessControlEnabled !== input.accessControlEnabled) {
				if (input.accessControlEnabled) {
					const authentication = {
						isAccessControlled: true as const,
						authToken: generateAuthToken(),
						role: 'judge_advisor' as const
					};

					// Client ACK first — if this fails, leave AC flag and attachment unchanged.
					await session.getClient<ClientRouter>(session.currentClient.clientId).onClientAuthenticationChange.mutation(authentication);

					await upsertJudgeAdvisorAuthToken(ctx.db, authentication.authToken);
					ctx.auth.setAuthentication(authentication);
				} else {
					const authentication = uncontrolledAuthentication;

					// Client ACK first — if this fails, leave AC flag and attachment unchanged.
					await session.getClient<ClientRouter>(session.currentClient.clientId).onClientAuthenticationChange.mutation(authentication);

					ctx.auth.setAuthentication(authentication);
				}

				// SAFETY: Must kick every other client when AC toggles.
				// With AC on, authorizeConnect only accepts controlled attachments, and DO
				// single-concurrency means no reconnect can slip in before the flag is written
				// below. Mutations then trust that uncontrolled sockets cannot exist while AC
				// is on (no per-mutation requireAuthenticated). Do not remove or narrow this kick.
				await ctx.network.kickOtherClients(session.currentClient.clientId);
				// Always broadcast: already-offline kicks do not get a webSocketClose update.
				broadcastDeviceListUpdate(ctx, session);
			}

			await updateEssentialData(ctx.db, input);

			// Do not wait for the broadcast to complete
			transaction(ctx.db, async (tx) => {
				return {
					essentialData: await getEssentialData(tx),
					teamData: await getTeamData(tx),
					judges: await getJudges(tx),
					finalAwardNominations: await getFinalAwardNominations(tx)
				} satisfies RoomState;
			}).then((message) => {
				session.broadcast<ClientRouter>().onEventSetupUpdate.mutation(message);
			});
		})
	};
}
