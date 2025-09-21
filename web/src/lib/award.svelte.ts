import type { CompetitionType, AwardType, Grade, Award } from '@judging.jerryio/protocol/src/award';
import { generateUUID } from './utils.svelte';

export class AwardOptions {
	public readonly id: string;
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
		this.id = generateUUID();
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

export function separateAwardOptionsByType(officialAwards: AwardOptions[]) {
	return {
		performanceAwards: officialAwards.filter((award) => award.possibleTypes.includes('performance')),
		judgedAwards: officialAwards.filter((award) => award.possibleTypes.includes('judged')),
		volunteerNominatedAwards: officialAwards.filter(
			(award) => !award.possibleTypes.includes('performance') && !award.possibleTypes.includes('judged')
		)
	};
}

/**
 * Restores AwardOptions from existing Awards while preserving the structure and order of official awards.
 *
 * This function reconstructs an AwardOptions array by merging selected awards with official award templates.
 * It attempts to preserve the original order of awards when possible, and handles both official awards
 * (which get marked as selected) and custom awards (which get converted to AwardOptions).
 *
 * @param awards - Array of existing Award objects that were previously selected/configured
 * @param officialAwards - Array of official AwardOptions templates available for the competition
 * @param competitionType - The type of competition (affects custom award creation)
 *
 * @returns Array of AwardOptions with:
 *   - Official awards marked as selected with updated winner counts and notebook requirements
 *   - Custom awards converted to AwardOptions format
 *   - Unselected official awards preserved for potential selection
 *   - Order preserved when the original award selection maintained official award ordering
 */
export function restoreAwardOptions(awards: Award[], officialAwards: AwardOptions[], competitionType: CompetitionType): AwardOptions[] {
	const rtn: AwardOptions[] = [];

	const v = awards.map((o) => o.name);
	const w = officialAwards.map((o) => o.name);
	const x = v.filter((a) => w.includes(a));
	const y = w.filter((a) => x.includes(a));
	// check the order of two lists is the same
	const z = y.every((a, index) => a === x[index]);

	if (z) {
		let i = 0;
		let j = 0;
		let k = 0;

		while (k < y.length) {
			while (officialAwards[j].name !== y[k]) {
				rtn.push(officialAwards[j++]);
			}

			while (awards[i].name !== y[k]) {
				const a = awards[i++];
				rtn.push(createCustomAwardOptions(a.name, competitionType, a.type, a.acceptedGrades, a.winnersCount, a.requireNotebook));
			}

			const o = officialAwards[j++];
			o.isSelected = true;
			o.possibleWinners = awards.find((a) => a.name === o.name)?.winnersCount ?? 1;
			rtn.push(o);
			i++;
			k++;
		}
		while (j < officialAwards.length) {
			const o = officialAwards[j++];
			rtn.push(o);
		}
		while (i < awards.length) {
			const a = awards[i++];
			rtn.push(createCustomAwardOptions(a.name, competitionType, a.type, a.acceptedGrades, a.winnersCount, a.requireNotebook));
		}
	} else {
		for (let i = 0; i < awards.length; i++) {
			const a = awards[i];
			const o = officialAwards.find((o) => o.name === a.name);
			if (o) {
				o.isSelected = true;
				o.possibleWinners = a.winnersCount;
				o.requireNotebook = a.requireNotebook;
				rtn.push(o);
			} else {
				rtn.push(createCustomAwardOptions(a.name, competitionType, a.type, a.acceptedGrades, a.winnersCount, a.requireNotebook));
			}
		}
		for (let j = 0; j < officialAwards.length; j++) {
			const o = officialAwards[j];
			if (!x.includes(o.name)) {
				rtn.push(o);
			}
		}
	}

	return rtn;
}
