import { z } from 'zod/v4';

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

export class AwardOptions {
	public name: string = $state('');
	public possibleCompetitionTypes: CompetitionType[];
	public possibleTypes: AwardType[] = $state([]);
	public selectedType: AwardType = $state('performance');
	public acceptedGrades: Grade[] = $state([]);
	public possibleWinners: number = $state(0);
	public requireNotebook: boolean = $state(false);
	public isOfficial: boolean;
	public isSelected: boolean = $state(false);

	constructor(
		name: string,
		possibleCompetitionTypes: CompetitionType[],
		possibleTypes: AwardType[],
		acceptedGrades: Grade[],
		possibleWinners: number,
		requireNotebook: boolean,
		isOfficial: boolean,
		isSelected: boolean
	) {
		this.name = name;
		this.possibleCompetitionTypes = possibleCompetitionTypes;
		this.possibleTypes = possibleTypes;
		this.selectedType = possibleTypes[0];
		this.acceptedGrades = acceptedGrades;
		this.possibleWinners = possibleWinners;
		this.requireNotebook = requireNotebook;
		this.isOfficial = isOfficial;
		this.isSelected = isSelected;
	}

	generateAward(): Award {
		return {
			name: this.name,
			type: this.selectedType,
			acceptedGrades: this.acceptedGrades,
			winnersCount: this.possibleWinners,
			requireNotebook: this.requireNotebook
		};
	}
}

/**
 * IMPORTANT: According to RECF Guide to Judging 2025_06-30
 *
 * <AW2>:
 * The precedence of Judged Awards is as follows, and aligns with Appendices A, B, and C in the Qualifying Criteria:
 * - For VIQRC: Excellence Award, Design Award, Innovate Award, Create Award, Think
 *   Award, Amaze Award, Build Award, Judges Award, Inspire Award, Sportsmanship
 *   Award, Energy Award.
 * - For all other programs: Excellence Award, Design Award, Innovate Award, Think
 *   Award, Amaze Award, Build Award, Create Award, Judges Award, Inspire Award,
 *   Sportsmanship Award, Energy Award.
 */
export function getOfficialAwardOptionsList(competitionType: CompetitionType, possibleGrades: Grade[]): AwardOptions[] {
	return [
		new AwardOptions(
			'Tournament Champions',
			['V5RC', 'VURC'],
			['performance'],
			['Middle School', 'High School', 'College'],
			2,
			false,
			true,
			true
		),
		new AwardOptions(
			'Tournament Finalists',
			['V5RC', 'VURC'],
			['performance'],
			['Middle School', 'High School', 'College'],
			2,
			false,
			true,
			true
		),
		new AwardOptions(
			'Tournament Semifinalists',
			['V5RC', 'VURC'],
			['performance'],
			['Middle School', 'High School', 'College'],
			4,
			false,
			true,
			false
		),
		new AwardOptions(
			'Tournament Quartnerfinalists',
			['V5RC', 'VURC'],
			['performance'],
			['Middle School', 'High School', 'College'],
			8,
			false,
			true,
			false
		),
		new AwardOptions('Teamwork Champion Award', ['VIQRC'], ['performance'], ['Elementary School', 'Middle School'], 2, false, true, true),
		new AwardOptions('Teamwork 2nd Place Award', ['VIQRC'], ['performance'], ['Elementary School', 'Middle School'], 2, false, true, true),
		new AwardOptions('Teamwork 3rd Place Award', ['VIQRC'], ['performance'], ['Elementary School', 'Middle School'], 2, false, true, true),
		new AwardOptions('Teamwork 4rd Place Award', ['VIQRC'], ['performance'], ['Elementary School', 'Middle School'], 2, false, true, false),
		new AwardOptions('Teamwork 5rd Place Award', ['VIQRC'], ['performance'], ['Elementary School', 'Middle School'], 2, false, true, false),
		new AwardOptions(
			'Robot Skills Champion',
			['VIQRC', 'V5RC', 'VURC'],
			['performance'],
			['Elementary School', 'Middle School'],
			1,
			false,
			true,
			true
		),
		new AwardOptions(
			'Robot Skills 2nd Place',
			['VIQRC', 'V5RC', 'VURC'],
			['performance'],
			['Elementary School', 'Middle School'],
			1,
			false,
			true,
			false
		),
		new AwardOptions(
			'Robot Skills 3rd Place',
			['VIQRC', 'V5RC', 'VURC'],
			['performance'],
			['Elementary School', 'Middle School'],
			1,
			false,
			true,
			false
		),
		new AwardOptions(
			'Excellence Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			true,
			true,
			true
		),
		new AwardOptions('Excellence Award - High School', ['V5RC'], ['judged'], ['High School'], 1, true, true, false),
		new AwardOptions('Excellence Award - Middle School', ['VIQRC', 'V5RC'], ['judged'], ['Middle School'], 1, true, true, false),
		new AwardOptions('Excellence Award - Elementary School', ['VIQRC'], ['judged'], ['Elementary School'], 1, true, true, false),
		new AwardOptions(
			'Design Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			true,
			true,
			true
		),
		new AwardOptions(
			'Innovate Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			true,
			true,
			true
		),
		new AwardOptions(
			'Create Award',
			['VIQRC'], // IMPORTANT: This option is only available for VIQRC
			['judged'],
			['Elementary School', 'Middle School'],
			1,
			true,
			true,
			false
		),
		new AwardOptions(
			'Think Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			true,
			true,
			false
		),
		new AwardOptions(
			'Amaze Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			true,
			true,
			false
		),
		new AwardOptions(
			'Build Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			true,
			true,
			false
		),
		new AwardOptions(
			'Create Award',
			['V5RC', 'VURC'], // IMPORTANT: This option is hidden for non-VIQRC
			['judged'],
			['Middle School', 'High School', 'College'],
			1,
			true,
			true,
			false
		),
		new AwardOptions(
			'Judges Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			false,
			true,
			true
		),
		new AwardOptions(
			'Inspire Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			false,
			true,
			false
		),
		new AwardOptions(
			'Sportsmanship Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged', 'volunteer_nominated'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			false,
			true,
			false
		),
		new AwardOptions(
			'Energy Award',
			['VIQRC', 'V5RC', 'VURC'],
			['judged', 'volunteer_nominated'],
			['Elementary School', 'Middle School', 'High School', 'College'],
			1,
			false,
			true,
			false
		)
	].filter(
		(a) =>
			a.possibleCompetitionTypes.includes(competitionType) &&
			a.acceptedGrades.some((g) => possibleGrades.includes(g)) &&
			!(possibleGrades.length === 1 && a.acceptedGrades.length === 1)
	);
}

export function createCustomAwardOptions(
	name: string,
	competitionType: CompetitionType,
	type: AwardType,
	acceptedGrades: Grade[],
	possibleWinners: number,
	requireNotebook: boolean
): AwardOptions {
	return new AwardOptions(name, [competitionType], [type], acceptedGrades, possibleWinners, requireNotebook, false, true);
}
