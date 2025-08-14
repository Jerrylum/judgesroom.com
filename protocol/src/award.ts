import { z } from 'zod';

export const CompetitionTypeSchema = z.enum(['VURC', 'V5RC', 'VIQRC']);
export type CompetitionType = z.infer<typeof CompetitionTypeSchema>;

export const AwardTypeSchema = z.enum(['performance', 'judged', 'volunteer_nominated']);
export type AwardType = z.infer<typeof AwardTypeSchema>;

export const GradeSchema = z.enum(['Elementary School', 'Middle School', 'High School', 'College']);
export type Grade = z.infer<typeof GradeSchema>;

export const AwardNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, { message: 'Award name must not have leading or trailing whitespace' });

export const AwardSchema = z.object({
	name: AwardNameSchema,
	type: AwardTypeSchema,
	acceptedGrades: z.array(GradeSchema),
	winnersCount: z.number().min(1).max(10000),
	requireNotebook: z.boolean()
});
export type Award = z.infer<typeof AwardSchema>;
