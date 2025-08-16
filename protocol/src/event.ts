import { z } from 'zod';
import { AwardSchema } from './award';
import { CompetitionTypeSchema } from './award';
import { TeamInfoSchema } from './team';
import { JudgingMethodSchema } from './judging';
import { JudgeGroupSchema } from './judging';

export const EventGradeLevelSchema = z.enum(['ES Only', 'MS Only', 'HS Only', 'Blended', 'College Only']);
export type EventGradeLevel = z.infer<typeof EventGradeLevelSchema>;

export const EventNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, { message: 'Event name must not have leading or trailing whitespace' });

export const EssentialDataSchema = z.object({
	eventName: EventNameSchema,
	competitionType: CompetitionTypeSchema,
	eventGradeLevel: EventGradeLevelSchema,
	performanceAwards: z.array(AwardSchema.extend({ type: z.literal('performance') })),
	judgedAwards: z.array(AwardSchema.extend({ type: z.literal('judged') })),
	volunteerNominatedAwards: z.array(AwardSchema.extend({ type: z.literal('volunteer_nominated') })),
	teams: z.array(TeamInfoSchema),
	judgingMethod: JudgingMethodSchema,
	judgeGroups: z.array(JudgeGroupSchema).min(1)
});

export type EssentialData = z.infer<typeof EssentialDataSchema>;
