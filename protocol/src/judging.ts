import { z } from 'zod';
import { TeamNumberSchema } from './team';

export const JudgingMethodSchema = z.enum(['walk_in', 'assigned']);
export type JudgingMethod = z.infer<typeof JudgingMethodSchema>;

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
	assignedTeams: z.array(z.string()) // Team IDs
});
export type JudgeGroup = z.infer<typeof JudgeGroupSchema>;
