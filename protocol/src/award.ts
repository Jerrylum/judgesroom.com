import { z } from 'zod';

export const ProgramSchema = z.enum(['VURC', 'V5RC', 'VIQRC']);
export type Program = z.infer<typeof ProgramSchema>;

export const AwardTypeSchema = z.enum(['performance', 'judged', 'volunteer_nominated']);
export type AwardType = z.infer<typeof AwardTypeSchema>;

export const GradeSchema = z.enum(['Elementary School', 'Middle School', 'High School', 'College']);
export type Grade = z.infer<typeof GradeSchema>;

/** Short grade label for compact UI (e.g. award requirement hints). */
export function formatGradeShort(grade: Grade): string {
	switch (grade) {
		case 'Elementary School':
			return 'ES';
		case 'Middle School':
			return 'MS';
		case 'High School':
			return 'HS';
		case 'College':
			return 'College';
	}
}

/** Grade mark beside a team number. College has no mark. */
export function formatGradeMark(grade: Grade): string {
	if (grade === 'College') return '';
	return formatGradeShort(grade);
}

export function formatGradesShort(grades: readonly Grade[]): string {
	return grades.map(formatGradeShort).join(', ');
}

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

function pairedDesignAwardName(excellenceAwardName: string): string {
	if (excellenceAwardName === 'Excellence Award') return 'Design Award';
	return excellenceAwardName.replace('Excellence Award', 'Design Award');
}

/**
 * Drag zone shared by an Excellence column and the Design column its finalists come from.
 * Omit presentAwardNames to map each award to its grade-paired name.
 * When the grade-paired column is absent, an unpaired column joins the generic Design Award zone,
 * so one Design column can feed two Excellence columns and the reverse.
 */
export function getDesignExcellenceSwapZone(awardName: string, presentAwardNames?: readonly string[]): string {
	const present = presentAwardNames ?? [];
	const has = (name: string) => present.length === 0 || present.includes(name);

	if (isExcellenceAward(awardName)) {
		const pairedDesign = pairedDesignAwardName(awardName);
		if (has(pairedDesign)) return pairedDesign;
		if (present.includes('Design Award')) return 'Design Award';
		return pairedDesign;
	}

	if (isDesignAward(awardName)) {
		if (has(getPairedExcellenceAwardName(awardName))) return awardName;
		if (present.includes('Excellence Award')) return 'Design Award';
		return awardName;
	}

	return awardName;
}

export function isDesignExcellenceSwapZone(zone: string): boolean {
	return zone === 'Design Award' || zone.startsWith('Design Award - ');
}
