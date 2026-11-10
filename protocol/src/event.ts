import { z } from 'zod';
import { AwardSchema } from './award';
import { ProgramSchema } from './award';
import { TeamInfoSchema } from './team';
import { JudgingMethodSchema, JudgingStepSchema } from './judging';
import { JudgeGroupSchema } from './judging';
import { JudgeGuideVersionSchema } from './judge-guide';

export const RobotEventsSkuSchema = z
	.string()
	.min(12)
	.max(20)
	.regex(/^[a-zA-Z0-9-]+$/, {
		message: 'VEX Events SKU must only contain English letters, numbers, and hyphens'
	});
export const RobotEventsEventIdSchema = z.number();

export const DivisionIdSchema = z.number();

export const EventGradeLevelSchema = z.enum(['ES Only', 'MS Only', 'HS Only', 'Blended', 'College Only']);
export type EventGradeLevel = z.infer<typeof EventGradeLevelSchema>;

export const EventNameSchema = z
	.string()
	.nonempty()
	.max(200)
	.regex(/^\S.*\S$|^\S$/, { message: 'Event name must not have leading or trailing whitespace' });

/** Choices shown in event setup. The stored step can be any positive finite number. */
export const RUBRIC_SCORE_STEP_OPTIONS = [0.1, 0.2, 0.5, 1] as const;
export const DEFAULT_RUBRIC_SCORE_STEP = 0.1;
export const RubricScoreStepSchema = z.number().positive().finite();

export function normalizeRubricScoreStep(step: number | null | undefined): number {
	if (step == null || !(step > 0) || !Number.isFinite(step)) return DEFAULT_RUBRIC_SCORE_STEP;
	return Math.round(step * 1000) / 1000;
}

export function rubricScoreStepOptions(current: number): number[] {
	const step = normalizeRubricScoreStep(current);
	if (RUBRIC_SCORE_STEP_OPTIONS.some((option) => option === step)) return [...RUBRIC_SCORE_STEP_OPTIONS];
	return [...RUBRIC_SCORE_STEP_OPTIONS, step];
}

export const EssentialDataSchema = z.object({
	robotEventsSku: RobotEventsSkuSchema.nullable(),
	robotEventsEventId: RobotEventsEventIdSchema.nullable(),
	divisionId: DivisionIdSchema.nullable(),
	eventName: EventNameSchema,
	program: ProgramSchema,
	eventGradeLevel: EventGradeLevelSchema,
	judgingMethod: JudgingMethodSchema,
	judgingStep: JudgingStepSchema,
	accessControlEnabled: z.boolean(),
	judgeGuideVersion: JudgeGuideVersionSchema,
	notebookRubricScoreStep: RubricScoreStepSchema,
	interviewRubricScoreStep: RubricScoreStepSchema,
	teamInfos: z.array(TeamInfoSchema),
	judgeGroups: z.array(JudgeGroupSchema).min(1),
	awards: z.array(AwardSchema)
});

export type EssentialData = z.infer<typeof EssentialDataSchema>;
