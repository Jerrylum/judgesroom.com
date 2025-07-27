import { z } from 'zod/v4';
import {
	AwardSchema,
	CompetitionTypeSchema,
	type CompetitionType,
	type Grade
} from './awards.svelte';
import { TeamInfoSchema } from './teams.svelte';
import { JudgeGroupSchema, JudgingMethodSchema } from './judging.svelte';

export const EventGradeLevelSchema = z.enum([
	'ES Only',
	'MS Only',
	'HS Only',
	'Blended',
	'College Only'
]);
export type EventGradeLevel = z.infer<typeof EventGradeLevelSchema>;

export interface EventGradeLevelOptions {
	value: EventGradeLevel;
	label: string;
	grades: Grade[];
}

export function getEventGradeLevelOptions(
	competitionType: CompetitionType
): EventGradeLevelOptions[] {
	switch (competitionType) {
		case 'VIQRC':
			return [
				{
					value: 'ES Only',
					label: 'Elementary School Only',
					grades: ['Elementary School']
				},
				{ value: 'MS Only', label: 'Middle School Only', grades: ['Middle School'] },
				{
					value: 'Blended',
					label: 'Blended (ES & MS)',
					grades: ['Elementary School', 'Middle School']
				}
			];
		case 'V5RC':
			return [
				{ value: 'MS Only', label: 'Middle School Only', grades: ['Middle School'] },
				{ value: 'HS Only', label: 'High School Only', grades: ['High School'] },
				{
					value: 'Blended',
					label: 'Blended (MS & HS)',
					grades: ['Middle School', 'High School']
				}
			];
		case 'VURC':
			return [{ value: 'College Only', label: 'College Only', grades: ['College'] }];
		default:
			return [];
	}
}

export const EventNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, { message: 'Event name must not have leading or trailing whitespace' });

export const EventSetupSchema = z.object({
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

export type EventSetup = z.infer<typeof EventSetupSchema>;
