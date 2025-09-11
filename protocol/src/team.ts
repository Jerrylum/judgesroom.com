import { z } from 'zod';
import { GradeSchema } from './award';

export const TeamNumberSchema = z
	.string()
	.nonempty()
	.max(10)
	.regex(/^[A-Z0-9]+$/, {
		message: 'Team number must only contain uppercase letters (A-Z) and digits (0-9)'
	});

export const TeamGroupNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, {
		message: 'Team group name must not have leading or trailing whitespace'
	});

export const TeamInfoSchema = z.object({
	id: z.uuidv4(),
	number: TeamNumberSchema,
	name: z.string(),
	city: z.string(),
	state: z.string(),
	country: z.string(),
	shortName: z.string(),
	school: z.string(),
	grade: GradeSchema,
	group: TeamGroupNameSchema
});

export type TeamInfo = z.infer<typeof TeamInfoSchema>;

export const TeamDataSchema = z.object({
	id: z.uuidv4(),
	notebookLink: z.string(),
	isDevelopedNotebook: z.boolean().nullable(),
	excluded: z.boolean()
});

export type TeamData = z.infer<typeof TeamDataSchema>;
