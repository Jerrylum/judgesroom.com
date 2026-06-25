import { z } from 'zod';

export const ProgramSchema = z.enum(['VURC', 'V5RC', 'VIQRC']);
export type Program = z.infer<typeof ProgramSchema>;

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
	requireNotebook: z.boolean(),
	requireTeamInterview: z.boolean()
});
export type Award = z.infer<typeof AwardSchema>;

export const ExcellenceAwardNameSchema = z.enum([
	'Excellence Award',
	'Excellence Award - High School',
	'Excellence Award - Middle School',
	'Excellence Award - Elementary School'
]);
export type ExcellenceAwardName = z.infer<typeof ExcellenceAwardNameSchema>;

export function isExcellenceAward(awardName: string): boolean {
	return ExcellenceAwardNameSchema.safeParse(awardName).success;
}

export const DesignAwardNameSchema = z.enum([
	'Design Award',
	'Design Award - High School',
	'Design Award - Middle School',
	'Design Award - Elementary School'
]);
export type DesignAwardName = z.infer<typeof DesignAwardNameSchema>;

export function isDesignAward(awardName: string): boolean {
	return DesignAwardNameSchema.safeParse(awardName).success;
}

export function getPairedExcellenceAwardName(designAwardName: DesignAwardName | string): ExcellenceAwardName {
	if (designAwardName === 'Design Award') return 'Excellence Award';
	return designAwardName.replace('Design Award', 'Excellence Award') as ExcellenceAwardName;
}

export function getDesignExcellenceSwapZone(awardName: string): string {
	if (isExcellenceAward(awardName)) {
		if (awardName === 'Excellence Award') return 'Design Award';
		return awardName.replace('Excellence Award', 'Design Award');
	}
	if (isDesignAward(awardName)) {
		return awardName;
	}
	return awardName;
}

export function isDesignExcellenceSwapZone(zone: string): boolean {
	return zone === 'Design Award' || zone.startsWith('Design Award - ');
}
