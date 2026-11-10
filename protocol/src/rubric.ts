import { z } from 'zod';
import { AwardNameSchema } from './award';
import { type RubricRowConfig, formatRubricScore, roundRubricScore, roundRubricScoreToStep, sumRubricScores } from './rubric-shared';
import {
	NOTEBOOK_1_0_CRITERIA_COUNT,
	NOTEBOOK_1_0_MAX_SCORE,
	createEmptyNotebook1_0Scores,
	generateNotebook1_0Scores,
	notebook1_0RubricArraySchema,
	notebook1_0RubricConfig,
	notebook1_0RubricSections,
	refineNotebook1_0Scores
} from './notebook-1.0';
import {
	NOTEBOOK_2_0_MAX_SCORE,
	NOTEBOOK_2_0_RUBRIC_VERSION,
	createEmptyNotebook2_0Scores,
	generateNotebook2_0Scores,
	notebook2_0PayloadToScores,
	notebook2_0RubricObjectSchema,
	notebook2_0ScoresToPayload,
	refineNotebook2_0Payload,
	type Notebook2_0RubricPayload
} from './notebook-2.0';
import {
	INTERVIEW_1_0_CRITERIA_COUNT,
	INTERVIEW_1_0_MAX_SCORE,
	createEmptyInterview1_0Scores,
	generateInterview1_0Scores,
	interview1_0RubricArraySchema,
	interview1_0RubricConfig,
	refineInterview1_0Scores
} from './interview-1.0';
import {
	INTERVIEW_2_0_MAX_SCORE,
	INTERVIEW_2_0_RUBRIC_VERSION,
	createEmptyInterview2_0Scores,
	generateInterview2_0Scores,
	interview2_0PayloadToScores,
	interview2_0RubricObjectSchema,
	interview2_0ScoresToPayload,
	refineInterview2_0Payload,
	type Interview2_0RubricPayload
} from './interview-2.0';

export * from './rubric-shared';
export * from './judge-guide';
export * from './notebook-1.0';
export * from './notebook-2.0';
export * from './interview-1.0';
export * from './interview-2.0';

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

export type { RubricRowConfig };

/** @deprecated Use notebook1_0RubricSections */
export const notebookRubricSections = notebook1_0RubricSections;
/** @deprecated Use notebook1_0RubricConfig */
export const notebookRubricConfig = notebook1_0RubricConfig;
/** @deprecated Use NOTEBOOK_1_0_CRITERIA_COUNT */
export const NOTEBOOK_RUBRIC_CRITERIA_COUNT = NOTEBOOK_1_0_CRITERIA_COUNT;
/** @deprecated Use NOTEBOOK_1_0_MAX_SCORE */
export const NOTEBOOK_RUBRIC_MAX_SCORE = NOTEBOOK_1_0_MAX_SCORE;

/** @deprecated Use interview1_0RubricConfig */
export const teamInterviewRubricConfig = interview1_0RubricConfig;
/** @deprecated Use INTERVIEW_1_0_CRITERIA_COUNT */
export const TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT = INTERVIEW_1_0_CRITERIA_COUNT;
/** @deprecated Use INTERVIEW_1_0_MAX_SCORE */
export const TEAM_INTERVIEW_RUBRIC_MAX_SCORE = INTERVIEW_1_0_MAX_SCORE;

export function createEmptyNotebookRubricScores(): number[] {
	return createEmptyNotebook1_0Scores();
}

export function createEmptyTeamInterviewRubricScores(): number[] {
	return createEmptyInterview1_0Scores();
}

export function generateNotebookRubricScores(): number[] {
	return generateNotebook1_0Scores();
}

export function generateTeamInterviewRubricScores(): number[] {
	return generateInterview1_0Scores();
}

export { formatRubricScore, roundRubricScore, roundRubricScoreToStep, sumRubricScores };

export const notebookRubricPayloadSchema = z.union([notebook1_0RubricArraySchema, notebook2_0RubricObjectSchema]);

export type NotebookRubricPayload = number[] | Notebook2_0RubricPayload;

export type DecodedNotebookRubric =
	| { version: '1.0'; scores: number[] }
	| { version: '2.0'; scores: number[]; payload: Notebook2_0RubricPayload };

export function decodeNotebookRubric(payload: unknown): DecodedNotebookRubric | null {
	if (Array.isArray(payload)) {
		const result = notebook1_0RubricArraySchema.superRefine((scores, ctx) => refineNotebook1_0Scores(scores, ctx)).safeParse(payload);
		if (!result.success) return null;
		return { version: '1.0', scores: result.data };
	}

	const refined = notebook2_0RubricObjectSchema.superRefine((data, ctx) => refineNotebook2_0Payload(data, ctx)).safeParse(payload);
	if (!refined.success) return null;
	return {
		version: '2.0',
		scores: notebook2_0PayloadToScores(refined.data),
		payload: refined.data
	};
}

export function encodeNotebookRubric(version: '1.0' | '2.0', scores: number[]): NotebookRubricPayload {
	if (version === '1.0') return scores;
	return notebook2_0ScoresToPayload(scores);
}

export function createEmptyNotebookScores(version: '1.0' | '2.0'): number[] {
	return version === '2.0' ? createEmptyNotebook2_0Scores() : createEmptyNotebook1_0Scores();
}

export function generateNotebookScores(version: '1.0' | '2.0'): number[] {
	return version === '2.0' ? generateNotebook2_0Scores() : generateNotebook1_0Scores();
}

export function sumNotebookRubric(payload: unknown): number | null {
	const decoded = decodeNotebookRubric(payload);
	if (!decoded) return null;
	return sumRubricScores(decoded.scores);
}

export function notebookRubricMaxScore(version: '1.0' | '2.0'): number {
	return version === '2.0' ? NOTEBOOK_2_0_MAX_SCORE : NOTEBOOK_1_0_MAX_SCORE;
}

export const interviewRubricPayloadSchema = z.union([interview1_0RubricArraySchema, interview2_0RubricObjectSchema]);

export type InterviewRubricPayload = number[] | Interview2_0RubricPayload;

export type DecodedInterviewRubric =
	| { version: '1.0'; scores: number[] }
	| { version: '2.0'; scores: number[]; payload: Interview2_0RubricPayload };

export function decodeInterviewRubric(payload: unknown): DecodedInterviewRubric | null {
	if (Array.isArray(payload)) {
		const result = interview1_0RubricArraySchema.superRefine((scores, ctx) => refineInterview1_0Scores(scores, ctx)).safeParse(payload);
		if (!result.success) return null;
		return { version: '1.0', scores: result.data };
	}

	const refined = interview2_0RubricObjectSchema.superRefine((data, ctx) => refineInterview2_0Payload(data, ctx)).safeParse(payload);
	if (!refined.success) return null;
	return {
		version: '2.0',
		scores: interview2_0PayloadToScores(refined.data),
		payload: refined.data
	};
}

export function encodeInterviewRubric(version: '1.0' | '2.0', scores: number[]): InterviewRubricPayload {
	if (version === '1.0') return scores;
	return interview2_0ScoresToPayload(scores);
}

export function createEmptyInterviewScores(version: '1.0' | '2.0'): number[] {
	return version === '2.0' ? createEmptyInterview2_0Scores() : createEmptyInterview1_0Scores();
}

export function generateInterviewScores(version: '1.0' | '2.0'): number[] {
	return version === '2.0' ? generateInterview2_0Scores() : generateInterview1_0Scores();
}

export function sumInterviewRubric(payload: unknown): number | null {
	const decoded = decodeInterviewRubric(payload);
	if (!decoded) return null;
	return sumRubricScores(decoded.scores);
}

export function interviewRubricMaxScore(version: '1.0' | '2.0'): number {
	return version === '2.0' ? INTERVIEW_2_0_MAX_SCORE : INTERVIEW_1_0_MAX_SCORE;
}

export const EngineeringNotebookRubricSchema = z
	.object({
		id: z.uuidv4(),
		teamId: z.uuidv4(),
		judgeId: z.uuidv4(),
		rubric: notebookRubricPayloadSchema,
		notes: z.string(),
		timestamp: z.number()
	})
	.superRefine((data, ctx) => {
		if (Array.isArray(data.rubric)) {
			refineNotebook1_0Scores(data.rubric, ctx);
			return;
		}
		if (data.rubric.rubricVersion === NOTEBOOK_2_0_RUBRIC_VERSION) {
			refineNotebook2_0Payload(data.rubric, ctx);
		}
	});

export type EngineeringNotebookRubric = z.infer<typeof EngineeringNotebookRubricSchema>;

export const TeamInterviewRubricSchema = z
	.object({
		id: z.uuidv4(),
		teamId: z.uuidv4(),
		judgeId: z.uuidv4(),
		rubric: interviewRubricPayloadSchema,
		notes: z.string(),
		timestamp: z.number()
	})
	.superRefine((data, ctx) => {
		if (Array.isArray(data.rubric)) {
			refineInterview1_0Scores(data.rubric, ctx);
			return;
		}
		if (data.rubric.rubricVersion === INTERVIEW_2_0_RUBRIC_VERSION) {
			refineInterview2_0Payload(data.rubric, ctx);
		}
	});

export type TeamInterviewRubric = z.infer<typeof TeamInterviewRubricSchema>;

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
