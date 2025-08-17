import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, primaryKey, unique, index } from 'drizzle-orm/sqlite-core';

// JERRY: To prevent potential issues, do not limit the length of the text columns

export const essential = sqliteTable('Essential', {
	eventName: text('eventName').notNull(),
	competitionType: text('competitionType', { enum: ['V5RC', 'VIQRC', 'VURC'] }).notNull(),
	eventGradeLevel: text('eventGradeLevel', { enum: ['ES Only', 'MS Only', 'HS Only', 'Blended', 'College Only'] }).notNull(),
	judgingMethod: text('judgingMethod', { enum: ['assigned', 'walk_in'] }).notNull()
});

export const awards = sqliteTable(
	'Awards',
	{
		name: text('name').primaryKey(),
		type: text('type', { enum: ['performance', 'judged', 'volunteer_nominated'] }).notNull(), // Performance, Judged, Volunteer Nominated award
		acceptedGrades: text('acceptedGrades', { mode: 'json' }).notNull(),
		winnersCount: integer('winnersCount').notNull(),
		requireNotebook: integer('requireNotebook', { mode: 'boolean' }).notNull()
	},
	(table) => [index('type').on(table.type)]
);

export const teams = sqliteTable(
	'Teams',
	{
		id: text('id').primaryKey(),
		number: text('number').notNull(),
		name: text('name').notNull(),
		city: text('city').notNull(),
		state: text('state').notNull(),
		country: text('country').notNull(),
		shortName: text('shortName').notNull(),
		school: text('school').notNull(),
		grade: text('grade', { enum: ['Elementary School', 'Middle School', 'High School', 'College'] }).notNull(),
		group: text('group').notNull(),
		notebookLink: text('notebookLink').notNull(),
		excluded: integer('excluded', { mode: 'boolean' }).notNull()
	},
	(table) => [index('number').on(table.number), index('group').on(table.group)]
);

export const judgeGroups = sqliteTable('JudgeGroups', {
	id: text('id').primaryKey(),
	name: text('name').notNull()
	// assignedTeams: text('assignedTeams', { mode: 'json' }).notNull()
});

export const judgeGroupsAssignedTeams = sqliteTable(
	'JudgeGroupsAssignedTeams',
	{
		judgeGroupId: text('judgeGroupId')
			.references(() => judgeGroups.id, { onDelete: 'cascade' })
			.notNull(),
		teamId: text('teamId')
			.primaryKey()
			.references(() => teams.id, { onDelete: 'cascade' })
	},
	(table) => [index('assignment').on(table.judgeGroupId, table.teamId)]
);

export const judges = sqliteTable('Judges', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	groupId: text('groupId')
		.references(() => judgeGroups.id, { onDelete: 'cascade' })
		.notNull()
});

export const finalAwardRankings = sqliteTable(
	'FinalAwardRankings',
	{
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		awardName: text('awardName').notNull(),
		ranking: integer('ranking').notNull()
	},
	(table) => [index('teamId').on(table.teamId), index('awardName').on(table.awardName)]
);

export const engineeringNotebookRubrics = sqliteTable(
	'EngineeringNotebookRubrics',
	{
		id: text('id').primaryKey(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		judgeId: text('judgeId')
			.references(() => judges.id, { onDelete: 'cascade' })
			.notNull(),
		rubric: text('rubric', { mode: 'json' }).notNull(),
		notes: text('notes').notNull(),
		innovateAwardNotes: text('innovateAwardNotes').notNull()
	},
	(table) => [index('teamId').on(table.teamId), index('judgeId').on(table.judgeId)]
);

export const teamInterviewRubrics = sqliteTable(
	'TeamInterviewRubrics',
	{
		id: text('id').primaryKey(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		judgeId: text('judgeId')
			.references(() => judges.id, { onDelete: 'cascade' })
			.notNull(),
		rubric: text('rubric', { mode: 'json' }).notNull()
	},
	(table) => [index('teamId').on(table.teamId), index('judgeId').on(table.judgeId)]
);

export const teamInterviewNotes = sqliteTable(
	'TeamInterviewNotes',
	{
		id: text('id').primaryKey(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		judgeId: text('judgeId')
			.references(() => judges.id, { onDelete: 'cascade' })
			.notNull(),
		rows: text('rows', { mode: 'json' }).notNull()
	},
	(table) => [index('teamId').on(table.teamId), index('judgeId').on(table.judgeId)]
);

export const awardRankings = sqliteTable(
	'AwardRankings',
	{
		judgeGroupId: text('judgeGroupId')
			.references(() => judgeGroups.id, { onDelete: 'cascade' })
			.notNull(),
		awardName: text('awardName')
			.references(() => awards.name, { onDelete: 'cascade' })
			.notNull(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		ranking: integer('ranking').notNull()
	},
	(table) => [primaryKey({ columns: [table.judgeGroupId, table.awardName, table.teamId] }), index('judgeGroupId').on(table.judgeGroupId)]
);

export const judgeGroupAwardNominations = sqliteTable(
	'JudgeGroupAwardNominations',
	{
		judgeGroupId: text('judgeGroupId')
			.references(() => judgeGroups.id, { onDelete: 'cascade' })
			.notNull(),
		awardName: text('awardName')
			.references(() => awards.name, { onDelete: 'cascade' })
			.notNull(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull()
	},
	(table) => [primaryKey({ columns: [table.judgeGroupId, table.awardName, table.teamId] }), index('judgeGroupId').on(table.judgeGroupId)]
);

export const finalAwardNominations = sqliteTable(
	'FinalAwardNominations',
	{
		awardName: text('awardName')
			.references(() => awards.name, { onDelete: 'cascade' })
			.notNull(),
		ranking: integer('ranking').notNull(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.awardName, table.ranking] }),
		index('awardName').on(table.awardName),
		index('awardRanking').on(table.awardName, table.ranking)
	]
);
