import { z } from 'zod';
import {
	type NotebookRubricSectionConfig,
	type RubricRowConfig,
	RubricPointSchema,
	roundRubricScore,
	validateRubricArray
} from './rubric-shared';

/** Proficiency column header point ranges per GRSF notebook-v1.0.pdf section. */
export type Notebook1_0ProficiencyHeaderScale = '3_2_1_0' | '5_3_2_0_1' | '4_3_2_0_1';

export type Notebook1_0SectionConfig = NotebookRubricSectionConfig<Notebook1_0ProficiencyHeaderScale>;

export const notebook1_0RubricSections: Notebook1_0SectionConfig[] = [
	{
		categoryKey: 'rubric_nb_1_0_cat_org_prof',
		sectionMaxPoints: 15,
		proficiencyHeaderScale: '3_2_1_0',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_org_cover', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_1_0_org_toc', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_1_0_org_pagination', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_1_0_org_dates', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_org_prof' },
			{ messageKeyPrefix: 'rubric_nb_1_0_org_presentation', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_org_prof' }
		]
	},
	{
		categoryKey: 'rubric_nb_1_0_cat_edp',
		sectionMaxPoints: 25,
		proficiencyHeaderScale: '5_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_edp_problem', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_1_0_edp_brainstorm', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_1_0_edp_decisions', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_1_0_edp_prototyping', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_edp' },
			{ messageKeyPrefix: 'rubric_nb_1_0_edp_iterative', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_edp' }
		]
	},
	{
		categoryKey: 'rubric_nb_1_0_cat_design',
		sectionMaxPoints: 20,
		proficiencyHeaderScale: '4_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_design_sketches', maxPoints: 4, categoryKey: 'rubric_nb_1_0_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_1_0_design_technical', maxPoints: 4, categoryKey: 'rubric_nb_1_0_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_1_0_design_calculations', maxPoints: 4, categoryKey: 'rubric_nb_1_0_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_1_0_design_cad', maxPoints: 4, categoryKey: 'rubric_nb_1_0_cat_design' },
			{ messageKeyPrefix: 'rubric_nb_1_0_design_evidence', maxPoints: 4, categoryKey: 'rubric_nb_1_0_cat_design' }
		]
	},
	{
		categoryKey: 'rubric_nb_1_0_cat_testing',
		sectionMaxPoints: 15,
		proficiencyHeaderScale: '5_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_test_procedures', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_testing' },
			{ messageKeyPrefix: 'rubric_nb_1_0_test_data', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_testing' },
			{ messageKeyPrefix: 'rubric_nb_1_0_test_analysis', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_testing' }
		]
	},
	{
		categoryKey: 'rubric_nb_1_0_cat_team_mgmt',
		sectionMaxPoints: 9,
		proficiencyHeaderScale: '3_2_1_0',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_team_roles', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_team_mgmt' },
			{ messageKeyPrefix: 'rubric_nb_1_0_team_meetings', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_team_mgmt' },
			{ messageKeyPrefix: 'rubric_nb_1_0_team_schedules', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_team_mgmt' }
		]
	},
	{
		categoryKey: 'rubric_nb_1_0_cat_reflection',
		sectionMaxPoints: 10,
		proficiencyHeaderScale: '5_3_2_0_1',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_reflect_competition', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_reflection' },
			{ messageKeyPrefix: 'rubric_nb_1_0_reflect_future', maxPoints: 5, categoryKey: 'rubric_nb_1_0_cat_reflection' }
		]
	},
	{
		categoryKey: 'rubric_nb_1_0_cat_completeness',
		sectionMaxPoints: 6,
		proficiencyHeaderScale: '3_2_1_0',
		criteria: [
			{ messageKeyPrefix: 'rubric_nb_1_0_complete_continuity', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_completeness' },
			{ messageKeyPrefix: 'rubric_nb_1_0_complete_growth', maxPoints: 3, categoryKey: 'rubric_nb_1_0_cat_completeness' }
		]
	}
];

export const notebook1_0RubricConfig: RubricRowConfig[] = notebook1_0RubricSections.flatMap((section) => section.criteria);

export const NOTEBOOK_1_0_CRITERIA_COUNT = notebook1_0RubricConfig.length;
export const NOTEBOOK_1_0_MAX_SCORE = notebook1_0RubricConfig.reduce((sum, row) => sum + row.maxPoints, 0);

export const notebook1_0RubricArraySchema = z.array(RubricPointSchema).length(NOTEBOOK_1_0_CRITERIA_COUNT);

export function createEmptyNotebook1_0Scores(): number[] {
	return Array(NOTEBOOK_1_0_CRITERIA_COUNT).fill(-1);
}

function randomRubricScore(maxPoints: number): number {
	const tenths = Math.floor(Math.random() * (maxPoints * 10 + 1));
	return tenths / 10;
}

export function generateNotebook1_0Scores(): number[] {
	return notebook1_0RubricConfig.map((row) => randomRubricScore(row.maxPoints));
}

export function refineNotebook1_0Scores(scores: number[], ctx: z.RefinementCtx) {
	validateRubricArray(scores, notebook1_0RubricConfig, 'rubric', ctx);
}

export { roundRubricScore };
