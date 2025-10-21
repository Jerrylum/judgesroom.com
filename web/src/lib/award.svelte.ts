import { type Program, type AwardType, type Grade, type Award } from '@judgesroom.com/protocol/src/award';
import { generateUUID } from './utils.svelte';
import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
import type { TeamInfo } from '@judgesroom.com/protocol/src/team';

export class AwardOptions {
	public readonly id: string;
	public name: string = $state('');
	public possiblePrograms: Program[];
	public possibleTypes: AwardType[] = $state([]);
	public selectedType: AwardType = $state('performance');
	public acceptedGrades: Grade[] = $state([]);
	public possibleWinners: number = $state(0);
	public requireNotebook: boolean = $state(false);
	public isOfficial: boolean;
	public isSelected: boolean = $state(false);

	constructor(
		name: string,
		possiblePrograms: Program[],
		possibleTypes: AwardType[],
		acceptedGrades: Grade[],
		possibleWinners: number,
		requireNotebook: boolean,
		isOfficial: boolean,
		isSelected: boolean
	) {
		this.id = generateUUID();
		this.name = name;
		this.possiblePrograms = possiblePrograms;
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
export function getOfficialAwardOptionsList(program: Program, possibleGrades: Grade[]): AwardOptions[] {
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
			a.possiblePrograms.includes(program) &&
			a.acceptedGrades.some((g) => possibleGrades.includes(g)) &&
			!(possibleGrades.length === 1 && a.acceptedGrades.length === 1)
	);
}

export function createCustomAwardOptions(
	name: string,
	program: Program,
	type: AwardType,
	acceptedGrades: Grade[],
	possibleWinners: number,
	requireNotebook: boolean
): AwardOptions {
	return new AwardOptions(name, [program], [type], acceptedGrades, possibleWinners, requireNotebook, false, true);
}

export function separateAwardOptionsByType(officialAwards: AwardOptions[]) {
	return {
		performanceAwards: officialAwards.filter((award) => award.selectedType === 'performance'),
		judgedAwards: officialAwards.filter((award) => award.selectedType === 'judged'),
		volunteerNominatedAwards: officialAwards.filter((award) => award.selectedType === 'volunteer_nominated')
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
 * @param program - The type of competition (affects custom award creation)
 *
 * @returns Array of AwardOptions with:
 *   - Official awards marked as selected with updated winner counts and notebook requirements
 *   - Custom awards converted to AwardOptions format
 *   - Unselected official awards preserved for potential selection
 *   - Order preserved when the original award selection maintained official award ordering
 */
export function restoreAwardOptions(awards: Award[], officialAwards: AwardOptions[], program: Program): AwardOptions[] {
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
				const o = officialAwards[j++];
				o.isSelected = false;
				rtn.push(o);
			}

			while (awards[i].name !== y[k]) {
				const a = awards[i++];
				rtn.push(createCustomAwardOptions(a.name, program, a.type, a.acceptedGrades, a.winnersCount, a.requireNotebook));
			}

			const o = officialAwards[j++];
			const a = awards.find((a) => a.name === o.name);
			o.selectedType = a?.type ?? o.possibleTypes[0];
			o.possibleWinners = a?.winnersCount ?? 1;
			o.isSelected = true;
			rtn.push(o);
			i++;
			k++;
		}
		while (j < officialAwards.length) {
			const o = officialAwards[j++];
			o.isSelected = false;
			rtn.push(o);
		}
		while (i < awards.length) {
			const a = awards[i++];
			rtn.push(createCustomAwardOptions(a.name, program, a.type, a.acceptedGrades, a.winnersCount, a.requireNotebook));
		}
	} else {
		for (let i = 0; i < awards.length; i++) {
			const a = awards[i];
			const o = officialAwards.find((o) => o.name === a.name);
			if (o) {
				o.selectedType = a.type;
				o.possibleWinners = a.winnersCount;
				o.isSelected = true;
				rtn.push(o);
			} else {
				rtn.push(createCustomAwardOptions(a.name, program, a.type, a.acceptedGrades, a.winnersCount, a.requireNotebook));
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

export function getJudgedAwardWinners(
	judgedAwards: Readonly<Award[]>,
	nominations: Readonly<Record<string, Readonly<AwardNomination>[]>>
): Record<string, string[]> {
	const rtn: Record<string, string[]> = {}; // award name -> team ids
	const allWinners: string[] = [];

	for (let i = 0; i < judgedAwards.length; i++) {
		const award = judgedAwards[i];
		const possibleWinners = award.winnersCount;
		const nom = nominations[award.name] || [];
		const winners: string[] = [];
		for (let j = 0; j < nom.length; j++) {
			const n = nom[j];
			if (allWinners.includes(n.teamId)) continue;
			allWinners.push(n.teamId);
			winners.push(n.teamId);
			if (winners.length >= possibleWinners) break;
		}
		rtn[award.name] = winners;
	}

	return rtn;
}

export function getAwardWinners(allAwards: Readonly<Award[]>, nominations: Readonly<Record<string, Readonly<AwardNomination>[]>>) {
	const judgedAwards = allAwards.filter((award) => award.type === 'judged');
	const rtn = getJudgedAwardWinners(judgedAwards, nominations); // award name -> team ids

	const otherAwards = allAwards.filter((award) => award.type !== 'judged');
	for (let i = 0; i < otherAwards.length; i++) {
		const award = otherAwards[i];
		const nom = nominations[award.name] || [];
		const winners: string[] = [];
		for (let j = 0; j < nom.length && j < award.winnersCount; j++) {
			winners.push(nom[j].teamId);
		}
		rtn[award.name] = winners;
	}
	return rtn;
}

export function groupAwardWinnersByTeamGroup(
	awardWinners: Readonly<Record<string, Readonly<string>[]>>,
	allTeams: Readonly<Record<string, Readonly<TeamInfo>>>
): Record<string, Record<string, Readonly<string>[]>> {
	const rtn: Record<string, Record<string, Readonly<string>[]>> = {}; // group id -> team id -> award names
	for (const teamId in allTeams) {
		const team = allTeams[teamId];
		const groupId = team.group;
		if (!rtn[groupId]) {
			rtn[groupId] = {};
		}
		const group = rtn[groupId];
		group[teamId] = [];
	}

	for (const awardName in awardWinners) {
		const winners = awardWinners[awardName]; // team ids
		for (let i = 0; i < winners.length; i++) {
			const winner = winners[i]; // team id
			const team = allTeams[winner];
			const groupId = team.group;
			const group = rtn[groupId];
			group[winner].push(awardName);
		}
	}
	return rtn;
}
