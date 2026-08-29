import { z } from 'zod';
import { RubricPointSchema, validateRubricPoint } from './rubric-shared';

export const INTERVIEW_2_0_RUBRIC_VERSION = '2.0' as const;
export const INTERVIEW_2_0_CRITERION_MAX = 2;

export const INTERVIEW_2_0_SCORE_LEVELS = [2, 1, 0] as const;
export type Interview2_0ScoreLevel = (typeof INTERVIEW_2_0_SCORE_LEVELS)[number];

export type Interview2_0CriterionConfig = {
	messageKeyPrefix: string;
	criterionKey: string;
	listenForKeys: string[];
	maxPoints: number;
};

export type Interview2_0SectionKey = 'explainYourLearning' | 'howYouWorkedWithOthers';

export type Interview2_0SectionConfig = {
	categoryKey: string;
	sectionKey: Interview2_0SectionKey;
	sectionMaxPoints: number;
	sampleQuestionKeys: string[];
	criteria: Interview2_0CriterionConfig[];
};

const criterion = (
	messageKeyPrefix: string,
	criterionKey: string,
	listenForKeys: string[]
): Interview2_0CriterionConfig => ({
	messageKeyPrefix,
	criterionKey,
	listenForKeys,
	maxPoints: INTERVIEW_2_0_CRITERION_MAX
});

export const interview2_0RubricSections: Interview2_0SectionConfig[] = [
	{
		categoryKey: 'rubric_ti_2_0_cat_explain',
		sectionKey: 'explainYourLearning',
		sectionMaxPoints: 6,
		sampleQuestionKeys: [
			'rubric_ti_2_0_q_explain_1',
			'rubric_ti_2_0_q_explain_2',
			'rubric_ti_2_0_q_explain_3',
			'rubric_ti_2_0_q_explain_4',
			'rubric_ti_2_0_q_explain_5'
		],
		criteria: [
			criterion('rubric_ti_2_0_own_work', 'studentsExplainTheirOwnWork', [
				'rubric_ti_2_0_own_work_listen_1',
				'rubric_ti_2_0_own_work_listen_2',
				'rubric_ti_2_0_own_work_listen_3',
				'rubric_ti_2_0_own_work_listen_4'
			]),
			criterion('rubric_ti_2_0_got_there', 'studentsTraceHowTheyGotThere', [
				'rubric_ti_2_0_got_there_listen_1',
				'rubric_ti_2_0_got_there_listen_2',
				'rubric_ti_2_0_got_there_listen_3'
			]),
			criterion('rubric_ti_2_0_knows_works', 'studentsShowHowTheyKnowItWorks', [
				'rubric_ti_2_0_knows_works_listen_1',
				'rubric_ti_2_0_knows_works_listen_2',
				'rubric_ti_2_0_knows_works_listen_3'
			])
		]
	},
	{
		categoryKey: 'rubric_ti_2_0_cat_others',
		sectionKey: 'howYouWorkedWithOthers',
		sectionMaxPoints: 6,
		sampleQuestionKeys: [
			'rubric_ti_2_0_q_others_1',
			'rubric_ti_2_0_q_others_2',
			'rubric_ti_2_0_q_others_3',
			'rubric_ti_2_0_q_others_4',
			'rubric_ti_2_0_q_others_5'
		],
		criteria: [
			criterion('rubric_ti_2_0_learned', 'studentsLearnedFromAndWithEachOther', [
				'rubric_ti_2_0_learned_listen_1',
				'rubric_ti_2_0_learned_listen_2',
				'rubric_ti_2_0_learned_listen_3'
			]),
			criterion('rubric_ti_2_0_decisions', 'decisionsWereMadeTogether', [
				'rubric_ti_2_0_decisions_listen_1',
				'rubric_ti_2_0_decisions_listen_2',
				'rubric_ti_2_0_decisions_listen_3'
			]),
			criterion('rubric_ti_2_0_outside', 'outsideIdeasWereMadeTheirOwn', [
				'rubric_ti_2_0_outside_listen_1',
				'rubric_ti_2_0_outside_listen_2',
				'rubric_ti_2_0_outside_listen_3',
				'rubric_ti_2_0_outside_listen_4'
			])
		]
	}
];

export const interview2_0RubricConfig: Interview2_0CriterionConfig[] = interview2_0RubricSections.flatMap(
	(section) => section.criteria
);

export const INTERVIEW_2_0_CRITERIA_COUNT = interview2_0RubricConfig.length;
export const INTERVIEW_2_0_MAX_SCORE = interview2_0RubricConfig.reduce((sum, row) => sum + row.maxPoints, 0);

const criterionBodySchema = z.object({
	notes: z.string(),
	points: RubricPointSchema
});

export const interview2_0RubricObjectSchema = z.object({
	rubricVersion: z.literal(INTERVIEW_2_0_RUBRIC_VERSION),
	explainYourLearning: z.object({
		studentsExplainTheirOwnWork: criterionBodySchema,
		studentsTraceHowTheyGotThere: criterionBodySchema,
		studentsShowHowTheyKnowItWorks: criterionBodySchema
	}),
	howYouWorkedWithOthers: z.object({
		studentsLearnedFromAndWithEachOther: criterionBodySchema,
		decisionsWereMadeTogether: criterionBodySchema,
		outsideIdeasWereMadeTheirOwn: criterionBodySchema
	}),
	additionalNotes: z.string()
});

export type Interview2_0RubricPayload = z.infer<typeof interview2_0RubricObjectSchema>;
export type Interview2_0CriterionBody = z.infer<typeof criterionBodySchema>;

export function createEmptyInterview2_0Scores(): number[] {
	return Array(INTERVIEW_2_0_CRITERIA_COUNT).fill(-1);
}

export function createEmptyInterview2_0Payload(): Interview2_0RubricPayload {
	return interview2_0ScoresToPayload(createEmptyInterview2_0Scores());
}

export function generateInterview2_0Scores(): number[] {
	return interview2_0RubricConfig.map(() => Math.floor(Math.random() * (INTERVIEW_2_0_CRITERION_MAX + 1)));
}

export function interview2_0ScoresToPayload(scores: number[]): Interview2_0RubricPayload {
	const payload: Record<string, Record<string, Interview2_0CriterionBody> | string> = {
		rubricVersion: INTERVIEW_2_0_RUBRIC_VERSION,
		additionalNotes: ''
	};
	let index = 0;
	for (const section of interview2_0RubricSections) {
		const sectionBody: Record<string, Interview2_0CriterionBody> = {};
		for (const row of section.criteria) {
			sectionBody[row.criterionKey] = { notes: '', points: scores[index] ?? -1 };
			index += 1;
		}
		payload[section.sectionKey] = sectionBody;
	}
	return payload as unknown as Interview2_0RubricPayload;
}

export function interview2_0PayloadToScores(payload: Interview2_0RubricPayload): number[] {
	const scores: number[] = [];
	for (const section of interview2_0RubricSections) {
		const sectionBody = payload[section.sectionKey];
		for (const row of section.criteria) {
			const criterionBody = sectionBody[row.criterionKey as keyof typeof sectionBody] as Interview2_0CriterionBody | undefined;
			scores.push(criterionBody?.points ?? -1);
		}
	}
	return scores;
}

export function refineInterview2_0Payload(payload: Interview2_0RubricPayload, ctx: z.RefinementCtx) {
	for (const section of interview2_0RubricSections) {
		const sectionBody = payload[section.sectionKey];
		for (const row of section.criteria) {
			const criterionBody = sectionBody[row.criterionKey as keyof typeof sectionBody] as Interview2_0CriterionBody | undefined;
			if (!criterionBody) continue;
			validateRubricPoint(criterionBody.points, row.maxPoints, ['rubric', section.sectionKey, row.criterionKey, 'points'], ctx);
		}
	}
}
