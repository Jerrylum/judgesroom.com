import { EssentialData, EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { awards, judgeGroups, judgeGroupsAssignedTeams, metadata, teams } from '../db/schema';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { Award, AwardType } from '@judging.jerryio/protocol/src/award';
import { eq, getTableColumns, inArray, not, sql, SQL } from 'drizzle-orm';
import { TeamInfo } from '@judging.jerryio/protocol/src/team';
import { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
import { SQLiteInsertValue, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import { transaction } from '../utils';

export async function getAwards(db: DatabaseOrTransaction, type?: AwardType): Promise<Award[]> {
	// JERRY: explicit type definition is needed to cast acceptedGrades from unknown to AwardType[]
	if (type) {
		return db.select().from(awards).where(eq(awards.type, type)) as Promise<Award[]>;
	}
	return db.select().from(awards) as Promise<Award[]>;
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
		await tx.delete(awards).where(
			not(
				inArray(
					awards['name'],
					values.map((v) => v['name'])
				)
			)
		);
		if (values.length > 0) {
			await tx
				.insert(awards)
				.values(values)
				.onConflictDoUpdate({
					target: [awards.name],
					set: buildConflictUpdateColumns(awards, Object.keys(values[0]) as (keyof Award)[])
				});
		}
	}

	async function updateInsertAndDeleteTeams(tx: DatabaseOrTransaction, values: TeamInfo[]) {
		await tx.delete(teams).where(
			not(
				inArray(
					teams.id,
					values.map((v) => v.id)
				)
			)
		);
		if (values.length > 0) {
			await tx
				.insert(teams)
				.values(values)
				.onConflictDoUpdate({
					target: [teams.id],
					set: buildConflictUpdateColumns(teams, Object.keys(values[0]) as (keyof TeamInfo)[])
				});
		}
	}

	async function updateInsertAndDeleteJudgeGroups(tx: DatabaseOrTransaction, values: JudgeGroup[]) {
		type DBJudgeGroup = SQLiteInsertValue<typeof judgeGroups>;
		await tx.delete(judgeGroups).where(
			not(
				inArray(
					judgeGroups.id,
					values.map((v) => v.id)
				)
			)
		);
		if (values.length > 0) {
			await tx
				.insert(judgeGroups)
				.values(values satisfies DBJudgeGroup[])
				.onConflictDoUpdate({
					target: [judgeGroups.id],
					set: buildConflictUpdateColumns(judgeGroups, ['id', 'name'])
				});
		}

		const assignedTeams = values.flatMap((v) => v.assignedTeams.map((t) => ({ judgeGroupId: v.id, teamId: t })));
		await tx.delete(judgeGroupsAssignedTeams);
		if (assignedTeams.length > 0) {
			await tx.insert(judgeGroupsAssignedTeams).values(assignedTeams);
		}
	}

	return transaction(db, async (tx) => {
		await tx.update(metadata).set(essentialData); // only for event name, competition type, event grade level, judging method
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
			session.broadcast<ClientRouter>().onEssentialDataUpdate.mutation(input);
		})
	};
}
