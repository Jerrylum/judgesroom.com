import { z } from 'zod';

export const JudgingMethodSchema = z.enum(['walk_in', 'assigned']);
export type JudgingMethod = z.infer<typeof JudgingMethodSchema>;

export const JudgingStepSchema = z.enum(['beginning', 'award_deliberations']);
export type JudgingStep = z.infer<typeof JudgingStepSchema>;

export const JudgeNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, { message: 'Judge name must not have leading or trailing whitespace' });

export const JudgeGroupNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, {
		message: 'Judge group name must not have leading or trailing whitespace'
	});

export const JudgeSchema = z.object({
	id: z.uuidv4(),
	name: JudgeNameSchema,
	groupId: z.uuidv4()
});

export type Judge = z.infer<typeof JudgeSchema>;

export const JudgeGroupSchema = z.object({
	id: z.uuidv4(),
	name: JudgeGroupNameSchema,
	assignedTeams: z.array(z.uuidv4()) // Team IDs
});
export type JudgeGroup = z.infer<typeof JudgeGroupSchema>;

export const ReassignTeamInputSchema = z.object({
	teamId: z.uuidv4(),
	toJudgeGroupId: z.uuidv4()
});
export type ReassignTeamInput = z.infer<typeof ReassignTeamInputSchema>;

/** Full snapshot of judge-group → ordered assigned team ids (after reassign). */
export const ReassignTeamsUpdateSchema = z.record(z.uuidv4(), z.array(z.uuidv4()));
export type ReassignTeamsUpdate = z.infer<typeof ReassignTeamsUpdateSchema>;
