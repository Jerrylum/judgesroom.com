import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import {
	EditingTeamList,
	parseTournamentManagerCSV,
	extractGroupFromTeamNumber,
	mapGradeToGradeLevel,
	groupTeamsByGroup,
	type TeamInfoAndData,
	readNotebookLinksExcel
} from './team.svelte';
import { v4 as uuidv4 } from 'uuid';
import { type TeamInfo, type TeamData, type NotebookDevelopmentStatus } from '@judging.jerryio/protocol/src/team';

describe('TeamInfo Class', () => {
	let teamInfo: TeamInfo;
	const mockId = uuidv4();

	beforeEach(() => {
		teamInfo = {
			id: mockId,
			number: '123A',
			name: 'Test Team',
			city: 'Test City',
			state: 'Test State',
			country: 'Test Country',
			shortName: 'TT',
			school: 'Test School',
			grade: 'High School',
			group: '123'
		}
	});

	it('should create a TeamInfo instance with correct properties', () => {
		expect(teamInfo.id).toBe(mockId);
		expect(teamInfo.number).toBe('123A');
		expect(teamInfo.name).toBe('Test Team');
		expect(teamInfo.city).toBe('Test City');
		expect(teamInfo.state).toBe('Test State');
		expect(teamInfo.country).toBe('Test Country');
		expect(teamInfo.shortName).toBe('TT');
		expect(teamInfo.school).toBe('Test School');
		expect(teamInfo.grade).toBe('High School');
		expect(teamInfo.group).toBe('123');
	});

	it('should allow modification of mutable properties', () => {
		teamInfo.name = 'Updated Team';
		teamInfo.city = 'Updated City';
		teamInfo.grade = 'College';

		expect(teamInfo.name).toBe('Updated Team');
		expect(teamInfo.city).toBe('Updated City');
		expect(teamInfo.grade).toBe('College');
	});

	it('should have readonly properties at compile time', () => {
		// Note: readonly is a TypeScript compile-time check, not runtime
		// The properties are still accessible at runtime but TypeScript prevents modification
		expect(teamInfo.id).toBe(mockId);
		expect(teamInfo.number).toBe('123A');

		// These properties should be readonly in TypeScript but accessible at runtime
		expect(typeof teamInfo.id).toBe('string');
		expect(typeof teamInfo.number).toBe('string');
	});
});

describe('TeamData Class', () => {
	let teamData: TeamData;

	beforeEach(() => {
		teamData = {
			id: uuidv4(),
			notebookLink: 'https://example.com/notebook',
			notebookDevelopmentStatus: 'undetermined',
			absent: false
		};
	});

	it('should create a TeamData instance with correct properties', () => {
		expect(teamData.notebookLink).toBe('https://example.com/notebook');
		expect(teamData.absent).toBe(false);
	});

	it('should allow modification of properties', () => {
		teamData.notebookLink = 'https://example.com/new-notebook';
		teamData.absent = true;

		expect(teamData.notebookLink).toBe('https://example.com/new-notebook');
		expect(teamData.absent).toBe(true);
	});
});


describe('EditingTeamList Class', () => {
	let teamList: EditingTeamList;
	let teams: TeamInfoAndData[];

	beforeEach(() => {
		const teamId1 = uuidv4();
		const teamId2 = uuidv4();
		teams = [
			{
				id: teamId1,
				number: '123A',
				name: 'Team A',
				city: 'City A',
				state: 'State A',
				country: 'Country A',
				shortName: 'TA',
				school: 'School A',
				grade: 'High School',
				group: '123',
				notebookLink: 'https://example.com/notebook-a',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: teamId2,
				number: '456B',
				name: 'Team B',
				city: 'City B',
				state: 'State B',
				country: 'Country B',
				shortName: 'TB',
				school: 'School B',
				grade: 'Middle School',
				group: '456',
				notebookLink: 'https://example.com/notebook-b',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			}
		];
		teamList = new EditingTeamList(teams);
	});

	it('should create a EditingTeamList with initial teams', () => {
		expect(teamList.length).toBe(2);
		expect(teamList.get(0)?.number).toBe('123A');
		expect(teamList.get(1)?.number).toBe('456B');
	});

	it('should create an empty EditingTeamList', () => {
		const emptyList = new EditingTeamList();
		expect(emptyList.length).toBe(0);
	});

	it('should be able to add teams', () => {
		const teamId3 = uuidv4();
		const newTeam: TeamInfoAndData = {
			id: teamId3,
			number: '789C',
			name: 'Team C',
			city: 'City C',
			state: 'State C',
			country: 'Country C',
			shortName: 'TC',
			school: 'School C',
			grade: 'College',
			group: '789',
			notebookLink: 'https://example.com/notebook-c',
			notebookDevelopmentStatus: 'undetermined',
			absent: false
		};

		teamList.push(newTeam);
		expect(teamList.length).toBe(3);
		expect(teamList.get(2)?.number).toBe('789C');
	});
});

describe('parseTournamentManagerCSV', () => {
	it('should parse valid CSV data', () => {
		const csvData = `Number,Name,City,State,Country,Short Name,School,Sponsor,Grade,Emergency Phone,Primary Coach Name,Primary Coach Email,Location
123A,Team Alpha,Alpha City,Alpha State,Alpha Country,TA,Alpha School,Alpha Sponsor,High School,555-1234,John Doe,john@example.com,Alpha Location
456B,Team Beta,Beta City,Beta State,Beta Country,TB,Beta School,Beta Sponsor,Middle School,555-5678,Jane Smith,jane@example.com,Beta Location`;

		const result = parseTournamentManagerCSV(csvData);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			number: '123A',
			name: 'Team Alpha',
			city: 'Alpha City',
			state: 'Alpha State',
			country: 'Alpha Country',
			shortName: 'TA',
			school: 'Alpha School',
			grade: 'High School',
			group: '123'
		});
		expect(result[1]).toMatchObject({
			number: '456B',
			name: 'Team Beta',
			city: 'Beta City',
			state: 'Beta State',
			country: 'Beta Country',
			shortName: 'TB',
			school: 'Beta School',
			grade: 'Middle School',
			group: '456'
		});
	});

	it('should handle empty optional fields', () => {
		const csvData = `Number,Name,City,State,Country,Short Name,School,Sponsor,Grade,Emergency Phone,Primary Coach Name,Primary Coach Email,Location
123A,,,,,,,,,,,,`;

		const result = parseTournamentManagerCSV(csvData);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			number: '123A',
			name: '',
			city: '',
			state: '',
			country: '',
			shortName: '',
			school: '',
			grade: 'College', // default grade
			group: '123'
		});
	});

	it('should reject invalid team numbers', () => {
		const csvData = `Number,Name,City,State,Country,Short Name,School,Sponsor,Grade,Emergency Phone,Primary Coach Name,Primary Coach Email,Location
123a,Team Alpha,Alpha City,Alpha State,Alpha Country,TA,Alpha School,Alpha Sponsor,High School,555-1234,John Doe,john@example.com,Alpha Location`;

		expect(() => parseTournamentManagerCSV(csvData)).toThrow(/Invalid team number/);
	});

	it('should reject duplicate team numbers', () => {
		const csvData = `Number,Name,City,State,Country,Short Name,School,Sponsor,Grade,Emergency Phone,Primary Coach Name,Primary Coach Email,Location
123A,Team Alpha,Alpha City,Alpha State,Alpha Country,TA,Alpha School,Alpha Sponsor,High School,555-1234,John Doe,john@example.com,Alpha Location
123A,Team Beta,Beta City,Beta State,Beta Country,TB,Beta School,Beta Sponsor,Middle School,555-5678,Jane Smith,jane@example.com,Beta Location`;

		expect(() => parseTournamentManagerCSV(csvData)).toThrow(/Duplicate team number/);
	});

	it('should reject empty team numbers', () => {
		const csvData = `Number,Name,City,State,Country,Short Name,School,Sponsor,Grade,Emergency Phone,Primary Coach Name,Primary Coach Email,Location
,Team Alpha,Alpha City,Alpha State,Alpha Country,TA,Alpha School,Alpha Sponsor,High School,555-1234,John Doe,john@example.com,Alpha Location`;

		expect(() => parseTournamentManagerCSV(csvData)).toThrow(/Team number is required/);
	});

	it('should handle malformed CSV', () => {
		const csvData = 'invalid csv data';

		expect(() => parseTournamentManagerCSV(csvData)).toThrow(/CSV parsing failed/);
	});

	it('should parse CSV with all-letter and mixed team numbers', () => {
		const csvData = `Number,Name,City,State,Country,Short Name,School,Sponsor,Grade,Emergency Phone,Primary Coach Name,Primary Coach Email,Location
APPLE,Team Apple,Apple City,Apple State,Apple Country,TA,Apple School,Apple Sponsor,High School,555-1111,John Apple,john@apple.com,Apple Location
BANANA1,Team Banana 1,Banana City,Banana State,Banana Country,TB1,Banana School,Banana Sponsor,High School,555-2222,Jane Banana,jane@banana.com,Banana Location
BANANA2,Team Banana 2,Banana City,Banana State,Banana Country,TB2,Banana School,Banana Sponsor,High School,555-3333,Bob Banana,bob@banana.com,Banana Location
BLRS1,BLRS Team 1,BLRS City,BLRS State,BLRS Country,B1,BLRS School,BLRS Sponsor,Middle School,555-4444,Alice BLRS,alice@blrs.com,BLRS Location
TEAM99A,Team 99A,Team City,Team State,Team Country,T99A,Team School,Team Sponsor,College,555-5555,Charlie Team,charlie@team.com,Team Location`;

		const result = parseTournamentManagerCSV(csvData);

		expect(result).toHaveLength(5);

		expect(result[0]).toMatchObject({
			number: 'APPLE',
			name: 'Team Apple',
			group: 'APPLE'
		});

		expect(result[1]).toMatchObject({
			number: 'BANANA1',
			name: 'Team Banana 1',
			group: 'BANANA'
		});

		expect(result[2]).toMatchObject({
			number: 'BANANA2',
			name: 'Team Banana 2',
			group: 'BANANA'
		});

		expect(result[3]).toMatchObject({
			number: 'BLRS1',
			name: 'BLRS Team 1',
			group: 'BLRS'
		});

		expect(result[4]).toMatchObject({
			number: 'TEAM99A',
			name: 'Team 99A',
			group: 'TEAM99'
		});
	});
});

describe('readNotebookLinksExcel', () => {
	it('should read valid Excel data', () => {
		
		const data = fs.readFileSync('./test/DigitalEngineeringNotebooks-Test.xlsx');

		const result = readNotebookLinksExcel(new Uint8Array(data));

		expect(result).matchSnapshot();
	});
});

describe('extractGroupFromTeamNumber', () => {
	it('should extract group from team numbers', () => {
		expect(extractGroupFromTeamNumber('123A')).toBe('123');
		expect(extractGroupFromTeamNumber('456B')).toBe('456');
		expect(extractGroupFromTeamNumber('BLRS1')).toBe('BLRS');
		expect(extractGroupFromTeamNumber('AB123C')).toBe('AB123');
		expect(extractGroupFromTeamNumber('A')).toBe('A');
	});

	it('should extract group from all-letter team numbers', () => {
		expect(extractGroupFromTeamNumber('APPLE')).toBe('APPLE');
		expect(extractGroupFromTeamNumber('BANANA1')).toBe('BANANA');
		expect(extractGroupFromTeamNumber('BANANA2')).toBe('BANANA');
		expect(extractGroupFromTeamNumber('CHERRY3')).toBe('CHERRY');
		expect(extractGroupFromTeamNumber('TEAM')).toBe('TEAM');
	});

	it('should extract group from mixed letter-number team numbers', () => {
		expect(extractGroupFromTeamNumber('BLRS1')).toBe('BLRS');
		expect(extractGroupFromTeamNumber('BLRS2')).toBe('BLRS');
		expect(extractGroupFromTeamNumber('TEAM99A')).toBe('TEAM99');
		expect(extractGroupFromTeamNumber('TEAM99B')).toBe('TEAM99');
		expect(extractGroupFromTeamNumber('ABC123X')).toBe('ABC123');
		expect(extractGroupFromTeamNumber('DEF456Y')).toBe('DEF456');
	});

	it('should handle single character team numbers', () => {
		expect(extractGroupFromTeamNumber('A')).toBe('A');
		expect(extractGroupFromTeamNumber('1')).toBe('1');
	});

	it('should handle empty string', () => {
		expect(extractGroupFromTeamNumber('')).toBe('');
	});
});

describe('mapGradeToGradeLevel', () => {
	it('should map elementary school variations', () => {
		expect(mapGradeToGradeLevel('Elementary')).toBe('Elementary School');
		expect(mapGradeToGradeLevel('elementary')).toBe('Elementary School');
		expect(mapGradeToGradeLevel('ELEMENTARY')).toBe('Elementary School');
		expect(mapGradeToGradeLevel('elem')).toBe('Elementary School');
		expect(mapGradeToGradeLevel('Elem School')).toBe('Elementary School');
	});

	it('should map middle school variations', () => {
		expect(mapGradeToGradeLevel('Middle')).toBe('Middle School');
		expect(mapGradeToGradeLevel('middle')).toBe('Middle School');
		expect(mapGradeToGradeLevel('MIDDLE')).toBe('Middle School');
		expect(mapGradeToGradeLevel('junior')).toBe('Middle School');
		expect(mapGradeToGradeLevel('Junior High')).toBe('Middle School');
	});

	it('should map high school variations', () => {
		expect(mapGradeToGradeLevel('High')).toBe('High School');
		expect(mapGradeToGradeLevel('high')).toBe('High School');
		expect(mapGradeToGradeLevel('HIGH')).toBe('High School');
		expect(mapGradeToGradeLevel('secondary')).toBe('High School');
		expect(mapGradeToGradeLevel('Secondary School')).toBe('High School');
	});

	it('should map college variations', () => {
		expect(mapGradeToGradeLevel('College')).toBe('College');
		expect(mapGradeToGradeLevel('college')).toBe('College');
		expect(mapGradeToGradeLevel('COLLEGE')).toBe('College');
		expect(mapGradeToGradeLevel('university')).toBe('College');
		expect(mapGradeToGradeLevel('University')).toBe('College');
	});

	it('should default to College for unknown grades', () => {
		expect(mapGradeToGradeLevel('Unknown')).toBe('College');
		expect(mapGradeToGradeLevel('')).toBe('College');
		expect(mapGradeToGradeLevel('Kindergarten')).toBe('College');
	});

	it('should handle whitespace', () => {
		expect(mapGradeToGradeLevel('  high school  ')).toBe('High School');
		expect(mapGradeToGradeLevel('\tmiddle\n')).toBe('Middle School');
	});
});

// mergeTeamData tests removed - function deprecated

describe('groupTeamsByGroup', () => {
	let teams: TeamInfoAndData[];

	beforeEach(() => {
		const teamIdA = uuidv4();
		const teamIdB = uuidv4();
		const teamIdC = uuidv4();
		const teamIdD = uuidv4();
		teams = [
			{
				id: teamIdA,
				number: '123A',
				name: 'Team Alpha',
				city: 'City A',
				state: 'State A',
				country: 'Country A',
				shortName: 'TA',
				school: 'School A',
				grade: 'High School',
				group: '123',
				notebookLink: 'https://example.com/notebook-a',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: teamIdB,
				number: '123B',
				name: 'Team Beta',
				city: 'City B',
				state: 'State B',
				country: 'Country B',
				shortName: 'TB',
				school: 'School B',
				grade: 'High School',
				group: '123',
				notebookLink: 'https://example.com/notebook-b',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: teamIdC,
				number: '456C',
				name: 'Team Gamma',
				city: 'City C',
				state: 'State C',
				country: 'Country C',
				shortName: 'TC',
				school: 'School C',
				grade: 'Middle School',
				group: '456',
				notebookLink: 'https://example.com/notebook-c',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: teamIdD,
				number: '789D',
				name: 'Team Delta',
				city: 'City D',
				state: 'State D',
				country: 'Country D',
				shortName: 'TD',
				school: 'School D',
				grade: 'College',
				group: '',
				notebookLink: 'https://example.com/notebook-d',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			}
		];
	});

	it('should group teams by their group name', () => {
		const result = groupTeamsByGroup(teams);

		expect(Object.keys(result)).toHaveLength(3);
		expect(result['123']).toHaveLength(2);
		expect(result['456']).toHaveLength(1);
		expect(result['Ungrouped']).toHaveLength(1);

		expect(result['123'][0].number).toBe('123A');
		expect(result['123'][1].number).toBe('123B');
		expect(result['456'][0].number).toBe('456C');
		expect(result['Ungrouped'][0].number).toBe('789D');
	});

	it('should handle empty teams array', () => {
		const result = groupTeamsByGroup([]);

		expect(Object.keys(result)).toHaveLength(0);
	});

	it('should handle all teams having empty group names', () => {
		const teamsWithoutGroups = teams.map((team) => ({
			...team,
			group: ''
		}));

		const result = groupTeamsByGroup(teamsWithoutGroups);

		expect(Object.keys(result)).toHaveLength(1);
		expect(result['Ungrouped']).toHaveLength(4);
	});

	it('should group teams with all-letter team numbers correctly', () => {
		const appleId = uuidv4();
		const banana1Id = uuidv4();
		const banana2Id = uuidv4();
		const cherry3Id = uuidv4();
		const letterTeams: TeamInfoAndData[] = [
			{
				id: appleId,
				number: 'APPLE',
				name: 'Team Apple',
				city: 'City A',
				state: 'State A',
				country: 'Country A',
				shortName: 'TA',
				school: 'School A',
				grade: 'High School',
				group: 'APPLE',
				notebookLink: 'https://example.com/notebook-apple',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: banana1Id,
				number: 'BANANA1',
				name: 'Team Banana 1',
				city: 'City B',
				state: 'State B',
				country: 'Country B',
				shortName: 'TB1',
				school: 'School B',
				grade: 'High School',
				group: 'BANANA',
				notebookLink: 'https://example.com/notebook-banana1',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: banana2Id,
				number: 'BANANA2',
				name: 'Team Banana 2',
				city: 'City C',
				state: 'State C',
				country: 'Country C',
				shortName: 'TB2',
				school: 'School C',
				grade: 'High School',
				group: 'BANANA',
				notebookLink: 'https://example.com/notebook-banana2',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: cherry3Id,
				number: 'CHERRY3',
				name: 'Team Cherry 3',
				city: 'City D',
				state: 'State D',
				country: 'Country D',
				shortName: 'TC3',
				school: 'School D',
				grade: 'Middle School',
				group: 'CHERRY',
				notebookLink: 'https://example.com/notebook-cherry3',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			}
		];

		const result = groupTeamsByGroup(letterTeams);

		expect(Object.keys(result)).toHaveLength(3);
		expect(result['APPLE']).toHaveLength(1);
		expect(result['BANANA']).toHaveLength(2);
		expect(result['CHERRY']).toHaveLength(1);

		expect(result['APPLE'][0].number).toBe('APPLE');
		expect(result['BANANA'][0].number).toBe('BANANA1');
		expect(result['BANANA'][1].number).toBe('BANANA2');
		expect(result['CHERRY'][0].number).toBe('CHERRY3');
	});

	it('should group mixed letter-number teams correctly', () => {
		const blrs1Id = uuidv4();
		const blrs2Id = uuidv4();
		const team99aId = uuidv4();
		const team99bId = uuidv4();
		const abc123xId = uuidv4();
		const mixedTeams: TeamInfoAndData[] = [
			{
				id: blrs1Id,
				number: 'BLRS1',
				name: 'BLRS Team 1',
				city: 'City A',
				state: 'State A',
				country: 'Country A',
				shortName: 'B1',
				school: 'School A',
				grade: 'High School',
				group: 'BLRS',
				notebookLink: 'https://example.com/notebook-blrs1',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: blrs2Id,
				number: 'BLRS2',
				name: 'BLRS Team 2',
				city: 'City B',
				state: 'State B',
				country: 'Country B',
				shortName: 'B2',
				school: 'School B',
				grade: 'High School',
				group: 'BLRS',
				notebookLink: 'https://example.com/notebook-blrs2',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: team99aId,
				number: 'TEAM99A',
				name: 'Team 99A',
				city: 'City C',
				state: 'State C',
				country: 'Country C',
				shortName: 'T99A',
				school: 'School C',
				grade: 'Middle School',
				group: 'TEAM99',
				notebookLink: 'https://example.com/notebook-team99a',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: team99bId,
				number: 'TEAM99B',
				name: 'Team 99B',
				city: 'City D',
				state: 'State D',
				country: 'Country D',
				shortName: 'T99B',
				school: 'School D',
				grade: 'Middle School',
				group: 'TEAM99',
				notebookLink: 'https://example.com/notebook-team99b',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			},
			{
				id: abc123xId,
				number: 'ABC123X',
				name: 'ABC 123 X',
				city: 'City E',
				state: 'State E',
				country: 'Country E',
				shortName: 'A123X',
				school: 'School E',
				grade: 'College',
				group: 'ABC123',
				notebookLink: 'https://example.com/notebook-abc123x',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			}
		];

		const result = groupTeamsByGroup(mixedTeams);

		expect(Object.keys(result)).toHaveLength(3);
		expect(result['BLRS']).toHaveLength(2);
		expect(result['TEAM99']).toHaveLength(2);
		expect(result['ABC123']).toHaveLength(1);

		expect(result['BLRS'].map((t) => t.number)).toEqual(['BLRS1', 'BLRS2']);
		expect(result['TEAM99'].map((t) => t.number)).toEqual(['TEAM99A', 'TEAM99B']);
		expect(result['ABC123'][0].number).toBe('ABC123X');
	});

	// it('temp', () => {
	// 	parseXlsx('./test/DigitalEngineeringNotebooks-Test.xlsx').then((data) => {
	// 		console.log(data);
	// 	});
	// });
});
