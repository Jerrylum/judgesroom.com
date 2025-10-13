import { sqliteTable, integer, text, primaryKey, index, uniqueIndex, unique } from 'drizzle-orm/sqlite-core';

// JERRY: To prevent potential issues, do not limit the length of the text columns

export const subscriptions = sqliteTable(
	'Subscriptions',
	{
		id: text('id').notNull(),
		judgeGroupId: text('judgeGroupId').references(() => judgeGroups.id, { onDelete: 'cascade' }),
		topic: text('topic').notNull()
	},
	(table) => [primaryKey({ columns: [table.id, table.judgeGroupId, table.topic] })]
);

export const offlineDevices = sqliteTable('OfflineDevices', {
	deviceId: text('deviceId').primaryKey(),
	deviceName: text('deviceName').notNull(),
	connectedAt: integer('connectedAt', { mode: 'timestamp' }).notNull()
});

export const metadata = sqliteTable('Metadata', {
	robotEventsSku: text('robotEventsSku'), // nullable, for example: RE-VIQRC-24-8288
	robotEventsEventId: integer('robotEventsEventId'), // nullable, for example: 58288
	divisionId: integer('divisionId'), // nullable, for example: 1
	eventName: text('eventName').notNull(),
	program: text('program', { enum: ['V5RC', 'VIQRC', 'VURC'] }).notNull(),
	eventGradeLevel: text('eventGradeLevel', { enum: ['ES Only', 'MS Only', 'HS Only', 'Blended', 'College Only'] }).notNull(),
	judgingMethod: text('judgingMethod', { enum: ['assigned', 'walk_in'] }).notNull(),
	judgingStep: text('judgingStep', { enum: ['beginning', 'award_deliberations'] }).notNull()
});

export const awards = sqliteTable(
	'Awards',
	{
		name: text('name').primaryKey(),
		type: text('type', { enum: ['performance', 'judged', 'volunteer_nominated'] }).notNull(), // Performance, Judged, Volunteer Nominated award
		acceptedGrades: text('acceptedGrades', { mode: 'json' }).notNull(),
		winnersCount: integer('winnersCount').notNull(),
		requireNotebook: integer('requireNotebook', { mode: 'boolean' }).notNull(),
		position: integer('position').notNull()
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
		group: text('group_').notNull(),
		notebookLink: text('notebookLink').notNull().default(''),
		notebookDevelopmentStatus: text('notebookDevelopmentStatus', {
			enum: ['undetermined', 'not_submitted', 'developing', 'fully_developed']
		})
			.notNull()
			.default('undetermined'),
		absent: integer('absent', { mode: 'boolean' }).notNull().default(false)
	},
	(table) => [uniqueIndex('teams_number').on(table.number), index('teams_group').on(table.group)]
);

export const judgeGroups = sqliteTable('JudgeGroups', {
	id: text('id').primaryKey(),
	name: text('name').notNull()
});

export const judgeGroupsAssignedTeams = sqliteTable(
	'JudgeGroupsAssignedTeams',
	{
		order: integer('order').unique().notNull(),
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
		innovateAwardNotes: text('innovateAwardNotes').notNull(),
		timestamp: integer('timestamp').notNull()
	},
	(table) => [
		index('engineering_notebook_rubrics_teamId').on(table.teamId),
		index('engineering_notebook_rubrics_judgeId').on(table.judgeId)
	]
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
		rubric: text('rubric', { mode: 'json' }).notNull(),
		notes: text('notes').notNull(),
		timestamp: integer('timestamp').notNull()
	},
	(table) => [index('team_interview_rubrics_teamId').on(table.teamId), index('team_interview_rubrics_judgeId').on(table.judgeId)]
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
		rows: text('rows', { mode: 'json' }).notNull(),
		timestamp: integer('timestamp').notNull()
	},
	(table) => [index('team_interview_notes_teamId').on(table.teamId), index('team_interview_notes_judgeId').on(table.judgeId)]
);

export const judgeGroupsSubmissionsCache = sqliteTable(
	'JudgeGroupsSubmissionsCache',
	{
		judgeGroupId: text('judgeGroupId')
			.references(() => judgeGroups.id, { onDelete: 'cascade' })
			.notNull(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		judgeId: text('judgeId')
			.references(() => judges.id, { onDelete: 'cascade' })
			.notNull(),
		timestamp: integer('timestamp').notNull(),
		enrId: text('enrId').references(() => engineeringNotebookRubrics.id, { onDelete: 'cascade' }),
		tiId: text('tiId').references(() => teamInterviewRubrics.id, { onDelete: 'cascade' }),
		tnId: text('tnId').references(() => teamInterviewNotes.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.enrId, table.tiId, table.tnId] }),
		index('judge_groups_submissions_cache_judgeGroupId').on(table.judgeGroupId)
	]
);

export const judgeGroupsReviewedTeams = sqliteTable(
	'JudgeGroupsReviewedTeams',
	{
		judgeGroupId: text('judgeGroupId')
			.references(() => judgeGroups.id, { onDelete: 'cascade' })
			.notNull(),
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull()
	},
	(table) => [primaryKey({ columns: [table.judgeGroupId, table.teamId] })]
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
	(table) => [
		primaryKey({ columns: [table.judgeGroupId, table.awardName, table.teamId] }),
		index('award_rankings_judgeGroupId').on(table.judgeGroupId)
	]
);

export const finalAwardNominations = sqliteTable(
	'FinalAwardNominations',
	{
		awardName: text('awardName')
			.references(() => awards.name, { onDelete: 'cascade' })
			.notNull(),
		ranking: integer('ranking').notNull(), // start at 0
		teamId: text('teamId')
			.references(() => teams.id, { onDelete: 'cascade' })
			.notNull(),
		judgeGroupId: text('judgeGroupId').references(() => judgeGroups.id, { onDelete: 'cascade' })
	},
	(table) => [
		uniqueIndex('final_award_nominations_awardName_ranking').on(table.awardName, table.ranking),
		unique('final_award_nominations_awardName_teamId').on(table.awardName, table.teamId)
	]
);
