import { z } from 'zod';
import { type RubricRowConfig, RubricPointSchema, validateRubricPoint } from './rubric-shared';

export const NOTEBOOK_2_0_RUBRIC_VERSION = '2.0' as const;
export const NOTEBOOK_2_0_CRITERION_MAX = 4;

export type Notebook2_0ProficiencyHeaderScale = '4_3_2_1';

export type Notebook2_0CriterionConfig = RubricRowConfig & {
	criterionKey: string;
};

export type Notebook2_0SectionConfig = {
	categoryKey: string;
	sectionKey: string;
	sectionMaxPoints: number;
	proficiencyHeaderScale: Notebook2_0ProficiencyHeaderScale;
	criteria: Notebook2_0CriterionConfig[];
};

const criterion = (messageKeyPrefix: string, criterionKey: string, categoryKey: string): Notebook2_0CriterionConfig => ({
	messageKeyPrefix,
	criterionKey,
	categoryKey,
	maxPoints: NOTEBOOK_2_0_CRITERION_MAX
});

export const notebook2_0RubricSections: Notebook2_0SectionConfig[] = [
	{
		categoryKey: 'rubric_nb_2_0_cat_organization',
		sectionKey: 'notebookOrganization',
		sectionMaxPoints: 16,
		proficiencyHeaderScale: '4_3_2_1',
		criteria: [
			criterion('rubric_nb_2_0_org_easy_to_reference', 'informationIsEasyToReference', 'rubric_nb_2_0_cat_organization'),
			criterion('rubric_nb_2_0_org_contributors', 'contributorsAreIdentifiable', 'rubric_nb_2_0_cat_organization'),
			criterion('rubric_nb_2_0_org_season', 'recordSpansTheSeason', 'rubric_nb_2_0_cat_organization'),
			criterion('rubric_nb_2_0_org_sources', 'outsideSourcesAreCredited', 'rubric_nb_2_0_cat_organization')
		]
	},
	{
		categoryKey: 'rubric_nb_2_0_cat_define',
		sectionKey: 'define',
		sectionMaxPoints: 12,
		proficiencyHeaderScale: '4_3_2_1',
		criteria: [
			criterion('rubric_nb_2_0_define_criteria', 'criteriaAndConstraintsAreDefined', 'rubric_nb_2_0_cat_define'),
			criterion('rubric_nb_2_0_define_strategy', 'gameStrategyIsDocumented', 'rubric_nb_2_0_cat_define'),
			criterion('rubric_nb_2_0_define_brainstorm', 'brainstormingIsDocumented', 'rubric_nb_2_0_cat_define')
		]
	},
	{
		categoryKey: 'rubric_nb_2_0_cat_develop',
		sectionKey: 'developSolutions',
		sectionMaxPoints: 16,
		proficiencyHeaderScale: '4_3_2_1',
		criteria: [
			criterion('rubric_nb_2_0_develop_prototypes', 'prototypesAreDocumented', 'rubric_nb_2_0_cat_develop'),
			criterion('rubric_nb_2_0_develop_test_procedures', 'testProceduresAreDefined', 'rubric_nb_2_0_cat_develop'),
			criterion('rubric_nb_2_0_develop_data', 'dataIsCollected', 'rubric_nb_2_0_cat_develop'),
			criterion('rubric_nb_2_0_develop_decisions', 'decisionsAreExplainedWithEvidence', 'rubric_nb_2_0_cat_develop')
		]
	},
	{
		categoryKey: 'rubric_nb_2_0_cat_optimize',
		sectionKey: 'optimize',
		sectionMaxPoints: 12,
		proficiencyHeaderScale: '4_3_2_1',
		criteria: [
			criterion('rubric_nb_2_0_optimize_mechanisms', 'mechanismsAreDocumented', 'rubric_nb_2_0_cat_optimize'),
			criterion('rubric_nb_2_0_optimize_code', 'codeIsDocumented', 'rubric_nb_2_0_cat_optimize'),
			criterion('rubric_nb_2_0_optimize_changes', 'changesAreTraceableToResults', 'rubric_nb_2_0_cat_optimize')
		]
	},
	{
		categoryKey: 'rubric_nb_2_0_cat_reflection',
		sectionKey: 'reflectionAndIteration',
		sectionMaxPoints: 8,
		proficiencyHeaderScale: '4_3_2_1',
		criteria: [
			criterion('rubric_nb_2_0_reflect_throughout', 'reflectionAppearsThroughout', 'rubric_nb_2_0_cat_reflection'),
			criterion('rubric_nb_2_0_reflect_iteration', 'iterationIsVisibleInSequence', 'rubric_nb_2_0_cat_reflection')
		]
	}
];

export const notebook2_0RubricConfig: Notebook2_0CriterionConfig[] = notebook2_0RubricSections.flatMap((section) => section.criteria);

export const NOTEBOOK_2_0_CRITERIA_COUNT = notebook2_0RubricConfig.length;
export const NOTEBOOK_2_0_MAX_SCORE = notebook2_0RubricConfig.reduce((sum, row) => sum + row.maxPoints, 0);

const criterionPointsSchema = z.object({
	points: RubricPointSchema
});

export const notebook2_0RubricObjectSchema = z.object({
	rubricVersion: z.literal(NOTEBOOK_2_0_RUBRIC_VERSION),
	notebookOrganization: z.object({
		informationIsEasyToReference: criterionPointsSchema,
		contributorsAreIdentifiable: criterionPointsSchema,
		recordSpansTheSeason: criterionPointsSchema,
		outsideSourcesAreCredited: criterionPointsSchema
	}),
	define: z.object({
		criteriaAndConstraintsAreDefined: criterionPointsSchema,
		gameStrategyIsDocumented: criterionPointsSchema,
		brainstormingIsDocumented: criterionPointsSchema
	}),
	developSolutions: z.object({
		prototypesAreDocumented: criterionPointsSchema,
		testProceduresAreDefined: criterionPointsSchema,
		dataIsCollected: criterionPointsSchema,
		decisionsAreExplainedWithEvidence: criterionPointsSchema
	}),
	optimize: z.object({
		mechanismsAreDocumented: criterionPointsSchema,
		codeIsDocumented: criterionPointsSchema,
		changesAreTraceableToResults: criterionPointsSchema
	}),
	reflectionAndIteration: z.object({
		reflectionAppearsThroughout: criterionPointsSchema,
		iterationIsVisibleInSequence: criterionPointsSchema
	})
});

export type Notebook2_0RubricPayload = z.infer<typeof notebook2_0RubricObjectSchema>;

export function createEmptyNotebook2_0Scores(): number[] {
	return Array(NOTEBOOK_2_0_CRITERIA_COUNT).fill(-1);
}

function randomRubricScore(maxPoints: number): number {
	const tenths = Math.floor(Math.random() * (maxPoints * 10 + 1));
	return tenths / 10;
}

export function generateNotebook2_0Scores(): number[] {
	return notebook2_0RubricConfig.map((row) => randomRubricScore(row.maxPoints));
}

export function notebook2_0ScoresToPayload(scores: number[]): Notebook2_0RubricPayload {
	const payload: Record<string, Record<string, { points: number }> | string> = {
		rubricVersion: NOTEBOOK_2_0_RUBRIC_VERSION
	};
	let index = 0;
	for (const section of notebook2_0RubricSections) {
		const sectionBody: Record<string, { points: number }> = {};
		for (const row of section.criteria) {
			sectionBody[row.criterionKey] = { points: scores[index] ?? 0 };
			index += 1;
		}
		payload[section.sectionKey] = sectionBody;
	}
	return payload as unknown as Notebook2_0RubricPayload;
}

export function notebook2_0PayloadToScores(payload: Notebook2_0RubricPayload): number[] {
	const scores: number[] = [];
	for (const section of notebook2_0RubricSections) {
		const sectionBody = payload[section.sectionKey as keyof Notebook2_0RubricPayload];
		if (typeof sectionBody === 'string') continue;
		for (const row of section.criteria) {
			const criterionBody = (sectionBody as Record<string, { points: number } | undefined>)[row.criterionKey];
			scores.push(criterionBody?.points ?? -1);
		}
	}
	return scores;
}

export function refineNotebook2_0Payload(payload: Notebook2_0RubricPayload, ctx: z.RefinementCtx) {
	for (const section of notebook2_0RubricSections) {
		const sectionBody = payload[section.sectionKey as keyof Notebook2_0RubricPayload];
		if (typeof sectionBody === 'string') continue;
		for (const row of section.criteria) {
			const criterionBody = (sectionBody as Record<string, { points: number } | undefined>)[row.criterionKey];
			if (!criterionBody) continue;
			validateRubricPoint(criterionBody.points, row.maxPoints, ['rubric', section.sectionKey, row.criterionKey, 'points'], ctx);
		}
	}
}
