import type { EssentialData } from '@judging.jerryio/protocol/src/event';
import { EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { awards, judgeGroups, judgeGroupsAssignedTeams, metadata, teams } from '../db/schema';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import type { Award, AwardType } from '@judging.jerryio/protocol/src/award';
import { eq, getTableColumns, inArray, not, sql, SQL } from 'drizzle-orm';
import type { TeamInfo } from '@judging.jerryio/protocol/src/team';
import type { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
import type { SQLiteInsertValue, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import { transaction } from '../utils';
import { getFinalAwardNominations } from './judging';
import { getTeamData } from './team';
import { getJudges } from './judge';

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
			eventName: metadataRows[0].eventName,
			competitionType: metadataRows[0].competitionType,
			eventGradeLevel: metadataRows[0].eventGradeLevel,
			judgingMethod: metadataRows[0].judgingMethod,
			judgingStep: metadataRows[0].judgingStep,
			awards: await getAwards(tx),
			teamInfos: await getTeamInfos(tx),
			judgeGroups: await getJudgeGroups(tx)
		};
	});
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

	return transaction(db, async (tx) => {
		await tx.delete(metadata);
		await tx.insert(metadata).values(essentialData); // only for event name, competition type, event grade level, judging method
		await updateInsertAndDeleteAwards(tx, essentialData.awards);
		await updateInsertAndDeleteTeams(tx, essentialData.teamInfos);
		await updateInsertAndDeleteJudgeGroups(tx, essentialData.judgeGroups);
	});
}

export function buildEssentialRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		updateEssentialData: w.procedure.input(EssentialDataSchema).mutation(async ({ ctx, input, session }) => {
			await updateEssentialData(ctx.db, input);

			// Do not wait for the broadcast to complete
			transaction(ctx.db, async (tx) => {
				return {
					essentialData: await getEssentialData(tx),
					teamData: await getTeamData(tx),
					judges: await getJudges(tx),
					finalAwardNominations: await getFinalAwardNominations(tx)
				};
			}).then((message) => {
				session.broadcast<ClientRouter>().onEventSetupUpdate.mutation(message);
			});
		})
	};
}
