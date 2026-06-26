import { z } from 'zod';
import { AwardNameSchema } from './award';

export const SubmissionSchema = z.object({
	id: z.uuidv4(),
	judgeId: z.uuidv4()
});

export type Submission = z.infer<typeof SubmissionSchema>;

export const SubmissionCacheSchema = z.object({
	judgeGroupId: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	enrId: z.uuidv4().nullable(),
	tiId: z.uuidv4().nullable(),
	tnId: z.uuidv4().nullable(),
	score: z.number().nullable()
});

export type SubmissionCache = z.infer<typeof SubmissionCacheSchema>;

/** Award candidate star rankings (0–5). Not used for rubric criterion scores. */
export const RankSchema = z.number().min(0).max(5);

export const RubricPointSchema = z.number().min(0);

export type RubricRowConfig = {
	messageKeyPrefix: string;
	maxPoints: number;
	categoryKey?: string;
};

/** Proficiency column header point ranges per GRSF notebook-v1.0.pdf section. */
export type NotebookProficiencyHeaderScale = '3_2_1_0' | '5_3_2_0_1' | '4_3_2_0_1';

export type NotebookRubricSectionConfig = {
	categoryKey: string;
	sectionMaxPoints: number;
	proficiencyHeaderScale: NotebookProficiencyHeaderScale;
	criteria: RubricRowConfig[];
};

export const notebookRubricSections: NotebookRubricSectionConfig[] = [
	{
		categoryKey: 'rubric_nb_cat_org_prof',
		sectionMaxPoints: 15,
		proficiencyHeaderScale: '3_2_1_0',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_org_cover', maxPoints: 3, categoryKey: 'rubric_nb_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_org_toc', maxPoints: 3, categoryKey: 'rubric_nb_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_org_pagination', maxPoints: 3, categoryKey: 'rubric_nb_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_org_dates', maxPoints: 3, categoryKey: 'rubric_nb_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_org_presentation', maxPoints: 3, categoryKey: 'rubric_nb_cat_org_prof' }
		]
	},
	{
		categoryKey: 'rubric_nb_cat_edp',
		sectionMaxPoints: 25,
		proficiencyHeaderScale: '5_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_edp_problem', maxPoints: 5, categoryKey: 'rubric_nb_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_edp_brainstorm', maxPoints: 5, categoryKey: 'rubric_nb_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_edp_decisions', maxPoints: 5, categoryKey: 'rubric_nb_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_edp_prototyping', maxPoints: 5, categoryKey: 'rubric_nb_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_edp_iterative', maxPoints: 5, categoryKey: 'rubric_nb_cat_edp' }
		]
	},
	{
		categoryKey: 'rubric_nb_cat_design',
		sectionMaxPoints: 20,
		proficiencyHeaderScale: '4_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_design_sketches', maxPoints: 4, categoryKey: 'rubric_nb_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_design_technical', maxPoints: 4, categoryKey: 'rubric_nb_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_design_calculations', maxPoints: 4, categoryKey: 'rubric_nb_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_design_cad', maxPoints: 4, categoryKey: 'rubric_nb_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_design_evidence', maxPoints: 4, categoryKey: 'rubric_nb_cat_design' }
		]
	},
	{
		categoryKey: 'rubric_nb_cat_testing',
		sectionMaxPoints: 15,
		proficiencyHeaderScale: '5_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_test_procedures', maxPoints: 5, categoryKey: 'rubric_nb_cat_testing' },
			{ messageKeyPrefix: 'rubric_nb_test_data', maxPoints: 5, categoryKey: 'rubric_nb_cat_testing' },
			{ messageKeyPrefix: 'rubric_nb_test_analysis', maxPoints: 5, categoryKey: 'rubric_nb_cat_testing' }
		]
	},
	{
		categoryKey: 'rubric_nb_cat_team_mgmt',
		sectionMaxPoints: 9,
		proficiencyHeaderScale: '3_2_1_0',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_team_roles', maxPoints: 3, categoryKey: 'rubric_nb_cat_team_mgmt' },
			{ messageKeyPrefix: 'rubric_nb_team_meetings', maxPoints: 3, categoryKey: 'rubric_nb_cat_team_mgmt' },
			{ messageKeyPrefix: 'rubric_nb_team_schedules', maxPoints: 3, categoryKey: 'rubric_nb_cat_team_mgmt' }
		]
	},
	{
		categoryKey: 'rubric_nb_cat_reflection',
		sectionMaxPoints: 10,
		proficiencyHeaderScale: '5_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_reflect_competition', maxPoints: 5, categoryKey: 'rubric_nb_cat_reflection' },
			{ messageKeyPrefix: 'rubric_nb_reflect_future', maxPoints: 5, categoryKey: 'rubric_nb_cat_reflection' }
		]
	},
	{
		categoryKey: 'rubric_nb_cat_completeness',
		sectionMaxPoints: 6,
		proficiencyHeaderScale: '3_2_1_0',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_complete_continuity', maxPoints: 3, categoryKey: 'rubric_nb_cat_completeness' },
			{ messageKeyPrefix: 'rubric_nb_complete_growth', maxPoints: 3, categoryKey: 'rubric_nb_cat_completeness' }
		]
	}
];

export const notebookRubricConfig: RubricRowConfig[] = notebookRubricSections.flatMap((section) => section.criteria);

export const teamInterviewRubricConfig: RubricRowConfig[] = [
	{ messageKeyPrefix: 'rubric_ti_engineering_design_process', maxPoints: 20 },
	{ messageKeyPrefix: 'rubric_ti_game_strategy', maxPoints: 15 },
	{ messageKeyPrefix: 'rubric_ti_robot_design', maxPoints: 15 },
	{ messageKeyPrefix: 'rubric_ti_robot_build', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_robot_code', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_project_management', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_teamwork_communication', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_respect_courtesy', maxPoints: 10 }
];

export const NOTEBOOK_RUBRIC_CRITERIA_COUNT = notebookRubricConfig.length;
export const TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT = 8;

export const NOTEBOOK_RUBRIC_MAX_SCORE = notebookRubricConfig.reduce((sum, row) => sum + row.maxPoints, 0);
export const TEAM_INTERVIEW_RUBRIC_MAX_SCORE = teamInterviewRubricConfig.reduce((sum, row) => sum + row.maxPoints, 0);

export function createEmptyNotebookRubricScores(): number[] {
	return Array(NOTEBOOK_RUBRIC_CRITERIA_COUNT).fill(-1);
}

export function createEmptyTeamInterviewRubricScores(): number[] {
	return Array(TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT).fill(-1);
}

/** Normalize a score to one decimal place. */
export function roundRubricScore(score: number): number {
	return Math.round(score * 10) / 10;
}

function randomRubricScore(maxPoints: number): number {
	const tenths = Math.floor(Math.random() * (maxPoints * 10 + 1));
	return tenths / 10;
}

export function generateNotebookRubricScores(): number[] {
	return notebookRubricConfig.map((row) => randomRubricScore(row.maxPoints));
}

export function generateTeamInterviewRubricScores(): number[] {
	return teamInterviewRubricConfig.map((row) => randomRubricScore(row.maxPoints));
}

export function formatRubricScore(score: number): string {
	return score.toFixed(1);
}

export function sumRubricScores(scores: number[]): number {
	const totalTenths = scores.reduce((sum, score) => sum + Math.round(score * 10), 0);
	return totalTenths / 10;
}

function validateRubricArray(scores: number[], config: RubricRowConfig[], path: string, ctx: z.RefinementCtx) {
	if (scores.length !== config.length) {
		ctx.addIssue({
			code: 'custom',
			path: [path],
			message: `Expected ${config.length} rubric scores, received ${scores.length}`
		});
		return;
	}

	for (let i = 0; i < scores.length; i++) {
		const score = scores[i];
		const maxPoints = config[i].maxPoints;
		if (score < 0 || score > maxPoints) {
			ctx.addIssue({
				code: 'custom',
				path: [path, i],
				message: `Score must be between 0 and ${maxPoints}`
			});
		}
		const rounded = roundRubricScore(score);
		if (Math.abs(score - rounded) > 0.001) {
			ctx.addIssue({
				code: 'custom',
				path: [path, i],
				message: 'Score must have at most one decimal place'
			});
		}
	}
}

const notebookRubricArraySchema = z.array(RubricPointSchema).length(NOTEBOOK_RUBRIC_CRITERIA_COUNT);
const teamInterviewRubricArraySchema = z.array(RubricPointSchema).length(TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT);

export const EngineeringNotebookRubricSchema = z
	.object({
		id: z.uuidv4(),
		teamId: z.uuidv4(),
		judgeId: z.uuidv4(),
		rubric: notebookRubricArraySchema,
		notes: z.string(),
		innovateAwardNotes: z.string(),
		timestamp: z.number()
	})
	.superRefine((data, ctx) => validateRubricArray(data.rubric, notebookRubricConfig, 'rubric', ctx));

export type EngineeringNotebookRubric = z.infer<typeof EngineeringNotebookRubricSchema>;

export const TeamInterviewRubricSchema = z
	.object({
		id: z.uuidv4(),
		teamId: z.uuidv4(),
		judgeId: z.uuidv4(),
		rubric: teamInterviewRubricArraySchema,
		notes: z.string(),
		timestamp: z.number()
	})
	.superRefine((data, ctx) => validateRubricArray(data.rubric, teamInterviewRubricConfig, 'rubric', ctx));

export type TeamInterviewRubric = z.infer<typeof TeamInterviewRubricSchema>;

export const TeamInterviewNoteSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rows: z.array(z.string()),
	timestamp: z.number()
});

export type TeamInterviewNote = z.infer<typeof TeamInterviewNoteSchema>;

export const AwardRankingsFullUpdateSchema = z.object({
	judgeGroupId: z.uuidv4(),
	judgedAwards: z.array(AwardNameSchema),
	// team id: [award 1 rank, award 2 rank, ...]
	rankings: z.record(z.uuidv4(), z.array(RankSchema))
});

export type AwardRankingsFullUpdate = z.infer<typeof AwardRankingsFullUpdateSchema>;

export const AwardRankingsPartialUpdateSchema = z.object({
	judgeGroupId: z.uuidv4(),
	teamId: z.uuidv4(),
	awardName: AwardNameSchema,
	ranking: RankSchema
});

export type AwardRankingsPartialUpdate = z.infer<typeof AwardRankingsPartialUpdateSchema>;

export const AwardNominationSchema = z.object({
	teamId: z.uuidv4(),
	judgeGroupId: z.uuidv4().nullable()
});

export type AwardNomination = z.infer<typeof AwardNominationSchema>;
