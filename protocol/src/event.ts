import { z } from 'zod';
import { AwardSchema } from './award';
import { ProgramSchema } from './award';
import { TeamInfoSchema } from './team';
import { JudgingMethodSchema, JudgingStepSchema } from './judging';
import { JudgeGroupSchema } from './judging';

export const RobotEventsSkuSchema = z
	.string()
	.min(12)
	.max(20)
	.regex(/^[a-zA-Z0-9-]+$/, {
		message: 'Robot Events SKU must only contain English letters, numbers, and hyphens'
	});
export const RobotEventsEventIdSchema = z.number();

export const EventGradeLevelSchema = z.enum(['ES Only', 'MS Only', 'HS Only', 'Blended', 'College Only']);
export type EventGradeLevel = z.infer<typeof EventGradeLevelSchema>;

export const EventNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, { message: 'Event name must not have leading or trailing whitespace' });

export const EssentialDataSchema = z.object({
	robotEventsSku: RobotEventsSkuSchema.optional(),
	robotEventsEventId: RobotEventsEventIdSchema.optional(),
	eventName: EventNameSchema,
	program: ProgramSchema,
	eventGradeLevel: EventGradeLevelSchema,
	judgingMethod: JudgingMethodSchema,
	judgingStep: JudgingStepSchema,
	teamInfos: z.array(TeamInfoSchema),
	judgeGroups: z.array(JudgeGroupSchema).min(1),
	awards: z.array(AwardSchema)
});

export type EssentialData = z.infer<typeof EssentialDataSchema>;
