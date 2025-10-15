import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { List } from './list.svelte';
import { SvelteSet } from 'svelte/reactivity';
import { type Grade } from '@judging.jerryio/protocol/src/award';
import {
	type TeamInfo,
	type TeamData,
	TeamNumberSchema,
	TeamGroupNameSchema,
	type NotebookDevelopmentStatus
} from '@judging.jerryio/protocol/src/team';

export type TeamInfoAndData = TeamInfo & TeamData;

export class EditingTeamList extends List<TeamInfoAndData, 'id'> {
	constructor(initialItems: TeamInfoAndData[] = []) {
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

export function parseTournamentManagerCSV(csvContent: string): Partial<TeamInfoAndData>[] {
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

export function groupTeamsByGroup(teamList: TeamInfoAndData[]): Record<string, TeamInfoAndData[]> {
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
