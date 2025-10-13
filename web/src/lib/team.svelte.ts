import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { List } from './list.svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { type Grade } from '@judging.jerryio/protocol/src/award';
import {
	type TeamInfo,
	type TeamData,
	TeamNumberSchema,
	TeamGroupNameSchema,
	type NotebookDevelopmentStatus
} from '@judging.jerryio/protocol/src/team';

export type TeamInfoAndData = TeamInfo & TeamData;

// Factory functions
export function createTeamInfo(
	id: string,
	number: string,
	name: string,
	city: string,
	state: string,
	country: string,
	shortName: string,
	school: string,
	grade: Grade,
	group: string
): TeamInfo {
	return {
		id,
		number,
		name,
		city,
		state,
		country,
		shortName,
		school,
		grade,
		group
	};
}

export function createTeamData(
	id: string,
	notebookLink: string,
	notebookDevelopmentStatus: NotebookDevelopmentStatus,
	absent: boolean
): TeamData {
	return {
		id,
		notebookLink,
		notebookDevelopmentStatus,
		absent
	};
}

export class EditingTeam {
	public readonly id: string;
	public info: TeamInfo;
	public data: TeamData;

	constructor(info: TeamInfo, data: TeamData) {
		if (info.id !== data.id) {
			throw new Error('Team info and data IDs do not match');
		}
		this.id = info.id;
		this.info = $state(info);
		this.data = $state(data);
	}

	get number() {
		return this.info.number;
	}
	get name() {
		return this.info.name;
	}
	set name(value: string) {
		this.info.name = value;
	}

	get city() {
		return this.info.city;
	}
	set city(value: string) {
		this.info.city = value;
	}

	get state() {
		return this.info.state;
	}
	set state(value: string) {
		this.info.state = value;
	}

	get country() {
		return this.info.country;
	}
	set country(value: string) {
		this.info.country = value;
	}

	get shortName() {
		return this.info.shortName;
	}
	set shortName(value: string) {
		this.info.shortName = value;
	}

	get school() {
		return this.info.school;
	}
	set school(value: string) {
		this.info.school = value;
	}

	get grade() {
		return this.info.grade;
	}
	set grade(value: Grade) {
		this.info.grade = value;
	}

	get group() {
		return this.info.group;
	}
	set group(value: string) {
		this.info.group = value;
	}

	get notebookLink() {
		return this.data.notebookLink;
	}
	set notebookLink(value: string) {
		this.data.notebookLink = value;
	}

	get notebookDevelopmentStatus() {
		return this.data.notebookDevelopmentStatus;
	}
	set notebookDevelopmentStatus(value: NotebookDevelopmentStatus) {
		this.data.notebookDevelopmentStatus = value;
	}

	get absent() {
		return this.data.absent;
	}
	set absent(value: boolean) {
		this.data.absent = value;
	}
}

export class EditingTeamList extends List<EditingTeam, 'id'> {
	constructor(initialItems: EditingTeam[] = []) {
		super('id', initialItems);
	}
}

// Type for Tournament Manager CSV row
interface TMCSVRow {
	Number: string;
	Name: string;
	City: string;
	State: string;
	Country: string;
	'Short Name': string;
	School: string;
	Sponsor: string;
	Grade: string;
	'Emergency Phone': string;
	'Primary Coach Name': string;
	'Primary Coach Email': string;
	Location: string;
}

// Update the return type to use the legacy format for compatibility
export function parseTournamentManagerCSV(csvContent: string): Partial<TeamInfo & TeamData>[] {
	const parseResult = Papa.parse<TMCSVRow>(csvContent, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (header: string) => header.trim()
	});

	if (parseResult.errors.length > 0) {
		console.error('CSV parsing errors:', parseResult.errors);
		throw new Error(`CSV parsing failed: ${parseResult.errors.map((e) => e.message).join(', ')}`);
	}

	const teams: Partial<TeamInfo & TeamData>[] = [];
	const seenTeamNumbers = new SvelteSet<string>();
	const validationErrors: string[] = [];

	parseResult.data.forEach((row, index) => {
		const rowNumber = index + 2; // +2 because Papa Parse starts from 0 and there's a header row
		const teamNumber = row.Number?.trim();

		// Validate team number exists
		if (!teamNumber) {
			validationErrors.push(`Row ${rowNumber}: Team number is required`);
			return;
		}

		// Validate team number format (A-Z and 0-9 only, max 10 chars)
		try {
			TeamNumberSchema.parse(teamNumber);
		} catch {
			validationErrors.push(
				`Row ${rowNumber}: Invalid team number "${teamNumber}" - must only contain uppercase letters (A-Z) and digits (0-9), max 10 characters`
			);
			return;
		}

		// Check for duplicate team numbers
		if (seenTeamNumbers.has(teamNumber)) {
			validationErrors.push(`Row ${rowNumber}: Duplicate team number "${teamNumber}"`);
			return;
		}

		seenTeamNumbers.add(teamNumber);

		// Extract and validate team group name
		const groupName = extractGroupFromTeamNumber(teamNumber);
		try {
			TeamGroupNameSchema.parse(groupName);
		} catch {
			validationErrors.push(
				`Row ${rowNumber}: Invalid team group name "${groupName}" derived from team number "${teamNumber}" - must not have leading/trailing whitespace and be max 100 characters`
			);
			return;
		}

		const team: Partial<TeamInfo & TeamData> = {
			number: teamNumber,
			name: row.Name || '',
			city: row.City || '',
			state: row.State || '',
			country: row.Country || '',
			shortName: row['Short Name'] || '',
			school: row.School || '',
			grade: mapGradeToGradeLevel(row.Grade || ''),
			notebookLink: '',
			notebookDevelopmentStatus: undefined,
			absent: undefined,
			group: groupName
		};

		teams.push(team);
	});

	// Throw error if there were validation issues
	if (validationErrors.length > 0) {
		throw new Error(`CSV validation failed:\n${validationErrors.join('\n')}`);
	}

	return teams;
}

// Type for notebook TSV row (flexible to handle different column names)
interface NotebookTSVRow {
	[key: string]: string;
}

export function parseNotebookData(tsvContent: string): Record<string, string> {
	const parseResult = Papa.parse<NotebookTSVRow>(tsvContent, {
		delimiter: '\t',
		header: true,
		skipEmptyLines: true,
		transformHeader: (header: string) => header.trim()
	});

	if (parseResult.errors.length > 0) {
		console.error('TSV parsing errors:', parseResult.errors);
		throw new Error(`Notebook data parsing failed: ${parseResult.errors.map((e) => e.message).join(', ')}`);
	}

	const notebookLinks: Record<string, string> = {};
	const validationErrors: string[] = [];

	parseResult.data.forEach((row, index) => {
		const rowNumber = index + 2; // +2 because Papa Parse starts from 0 and there's a header row
		const teamNumber = row.team || row.Team || '';
		const link = row.notebook_link || row['Notebook Link'] || '';

		if (teamNumber && link && link !== 'none') {
			// Validate team number format
			try {
				TeamNumberSchema.parse(teamNumber);
				notebookLinks[teamNumber] = link;
			} catch {
				validationErrors.push(
					`Row ${rowNumber}: Invalid team number "${teamNumber}" in notebook data - must only contain uppercase letters (A-Z) and digits (0-9), max 10 characters`
				);
			}
		}
	});

	// Just warn about validation errors for notebook data since it's optional
	if (validationErrors.length > 0) {
		console.warn(`Notebook data validation warnings:\n${validationErrors.join('\n')}`);
	}

	return notebookLinks;
}

export function extractGroupFromTeamNumber(teamNumber: string): string {
	// If team number is empty or single character, return as is
	if (teamNumber.length <= 1) {
		return teamNumber;
	}

	// Check if the team number contains any digits
	const hasDigits = /[0-9]/.test(teamNumber);

	// If team number is all letters (no digits), keep it as is (e.g., "APPLE" -> "APPLE")
	if (!hasDigits) {
		return teamNumber;
	}

	// If team number contains digits, remove the last character
	// This handles cases like "BANANA1" -> "BANANA", "123A" -> "123", "BLRS1" -> "BLRS"
	return teamNumber.slice(0, -1);
}

export function mapGradeToGradeLevel(gradeString: string): Grade {
	// Normalize and map common grade strings to Grade enum values
	const normalizedGrade = gradeString.trim().toLowerCase();

	if (normalizedGrade.includes('elementary') || normalizedGrade.includes('elem')) {
		return 'Elementary School';
	} else if (normalizedGrade.includes('middle') || normalizedGrade.includes('junior')) {
		return 'Middle School';
	} else if (normalizedGrade.includes('high') || normalizedGrade.includes('secondary')) {
		return 'High School';
	} else if (normalizedGrade.includes('college') || normalizedGrade.includes('university')) {
		return 'College';
	}

	// Default to College if no match found
	return 'College';
}

export function mergeTeamData(
	csvTeams: Partial<TeamInfo & TeamData>[],
	notebookLinks: Record<string, string>,
	existingTeams: EditingTeam[] = []
): EditingTeam[] {
	const existingTeamMap = new SvelteMap(existingTeams.map((team) => [team.number, team]));

	return csvTeams.map((team) => {
		const existingTeam = existingTeamMap.get(team.number!);
		const id = existingTeam?.id || uuidv4(); // reuse existing team id if it exists
		const teamNumber = team.number!; // Already validated in parseTournamentManagerCSV
		const notebookLink = notebookLinks[teamNumber] || '';

		const teamInfo = createTeamInfo(
			id,
			teamNumber,
			team.name || '',
			team.city || '',
			team.state || '',
			team.country || '',
			team.shortName || '',
			team.school || '',
			team.grade || 'College',
			team.group || ''
		);

		const teamData = createTeamData(
			id,
			notebookLink,
			team.notebookDevelopmentStatus ?? existingTeam?.notebookDevelopmentStatus ?? 'undetermined',
			team.absent ?? existingTeam?.absent ?? false
		);

		return new EditingTeam(teamInfo, teamData);
	});
}

export function groupTeamsByGroup(teams: EditingTeam[]): Record<string, EditingTeam[]> {
	const groups: Record<string, EditingTeam[]> = {};

	teams.forEach((team) => {
		const groupName = team.group || 'Ungrouped';
		if (!groups[groupName]) {
			groups[groupName] = [];
		}
		groups[groupName].push(team);
	});

	return groups;
}

export class EditingTeamListV2 extends List<TeamInfoAndData, 'id'> {
	constructor(initialItems: TeamInfoAndData[] = []) {
		super('id', initialItems);
	}
}

export function groupTeamsByGroupV2(teamList: TeamInfoAndData[]): Record<string, TeamInfoAndData[]> {
	const groups: Record<string, TeamInfoAndData[]> = {};

	teamList.forEach((team) => {
		const groupName = team.group || 'Ungrouped';
		if (!groups[groupName]) {
			groups[groupName] = [];
		}
		groups[groupName].push(team);
	});

	return groups;
}

export function sortByTeamNumber(teams: Readonly<TeamInfoAndData>[]) {
	return teams.sort((a, b) => {
		const aIsStartWithDigit = /[0-9]/.test(a.number);
		const bIsStartWithDigit = /[0-9]/.test(b.number);

		if (aIsStartWithDigit && !bIsStartWithDigit) {
			return -1;
		} else if (!aIsStartWithDigit && bIsStartWithDigit) {
			return 1;
		} else if (aIsStartWithDigit && bIsStartWithDigit) {
			// 0000A -> 0000 (all letters after the digits are ignored)
			const aNumber = parseInt(a.number);
			const bNumber = parseInt(b.number);
			return aNumber - bNumber;
		} else {
			return a.number.localeCompare(b.number);
		}
	});
}

export function sortByTeamNumberInMap(teamIds: Readonly<string>[], teamsMap: Readonly<Record<string, Readonly<TeamInfoAndData>>>) {
	return teamIds.sort((a, b) => {
		const aIsStartWithDigit = /[0-9]/.test(teamsMap[a].number);
		const bIsStartWithDigit = /[0-9]/.test(teamsMap[b].number);

		if (aIsStartWithDigit && !bIsStartWithDigit) {
			return -1;
		} else if (!aIsStartWithDigit && bIsStartWithDigit) {
			return 1;
		} else if (aIsStartWithDigit && bIsStartWithDigit) {
			// 0000A -> 0000 (all letters after the digits are ignored)
			const aNumber = parseInt(teamsMap[a].number);
			const bNumber = parseInt(teamsMap[b].number);
			return aNumber - bNumber;
		} else {
			return teamsMap[a].number.localeCompare(teamsMap[b].number);
		}
	});
}

export function sortByAssignedTeams(
	includedTeams: Readonly<Record<string, Readonly<TeamInfoAndData>>>,
	assignedTeamIds: string[]
): TeamInfoAndData[] {
	return assignedTeamIds.map((id) => includedTeams[id]);
}

export function sortByNotebookDevelopmentStatus(teams: TeamInfoAndData[]): TeamInfoAndData[] {
	return teams.sort((a, b) => {
		const aIsDeveloped = a.notebookDevelopmentStatus;
		const bIsDeveloped = b.notebookDevelopmentStatus;
		if (aIsDeveloped !== bIsDeveloped) {
			if (aIsDeveloped === 'fully_developed') return -1;
			if (bIsDeveloped === 'fully_developed') return 1;
			if (aIsDeveloped === 'developing') return -1;
			if (bIsDeveloped === 'developing') return 1;
			if (aIsDeveloped === 'not_submitted') return -1;
			if (bIsDeveloped === 'not_submitted') return 1;
		}
		return 0;
	});
}
