import { describe, it, expect, beforeEach } from 'vitest';
import {
	createTeamInfo,
	createTeamData,
	EditingTeam,
	EditingTeamList,
	parseTournamentManagerCSV,
	parseNotebookData,
	extractGroupFromTeamNumber,
	mapGradeToGradeLevel,
	mergeTeamData,
	groupTeamsByGroup
} from './team.svelte';
import { v4 as uuidv4 } from 'uuid';
import { type TeamInfo, type TeamData } from '@judging.jerryio/protocol/src/team';
import { type Grade } from '@judging.jerryio/protocol/src/award';

describe('TeamInfo Class', () => {
	let teamInfo: TeamInfo;
	const mockId = uuidv4();

	beforeEach(() => {
		teamInfo = createTeamInfo(
			mockId,
			'123A',
			'Test Team',
			'Test City',
			'Test State',
			'Test Country',
			'TT',
			'Test School',
			'High School',
			'123'
		);
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
		teamData = createTeamData(uuidv4(), 'https://example.com/notebook', null, false);
	});

	it('should create a TeamData instance with correct properties', () => {
		expect(teamData.notebookLink).toBe('https://example.com/notebook');
		expect(teamData.excluded).toBe(false);
	});

	it('should allow modification of properties', () => {
		teamData.notebookLink = 'https://example.com/new-notebook';
		teamData.excluded = true;

		expect(teamData.notebookLink).toBe('https://example.com/new-notebook');
		expect(teamData.excluded).toBe(true);
	});
});

describe('Team Class', () => {
	let team: EditingTeam;
	let teamInfo: TeamInfo;
	let teamData: TeamData;

	beforeEach(() => {
		teamInfo = createTeamInfo(
			uuidv4(),
			'123A',
			'Test Team',
			'Test City',
			'Test State',
			'Test Country',
			'TT',
			'Test School',
			'High School',
			'123'
		);
		teamData = createTeamData(teamInfo.id, 'https://example.com/notebook', null, false);
		team = new EditingTeam(teamInfo, teamData);
	});

	it('should create a Team instance with correct properties', () => {
		expect(team.id).toBe(teamInfo.id);
		expect(team.info).toBe(teamInfo);
		expect(team.data).toBe(teamData);
	});

	it('should provide convenience getters for team info', () => {
		expect(team.number).toBe('123A');
		expect(team.name).toBe('Test Team');
		expect(team.city).toBe('Test City');
		expect(team.state).toBe('Test State');
		expect(team.country).toBe('Test Country');
		expect(team.shortName).toBe('TT');
		expect(team.school).toBe('Test School');
		expect(team.grade).toBe('High School');
		expect(team.group).toBe('123');
	});

	it('should provide convenience getters for team data', () => {
		expect(team.notebookLink).toBe('https://example.com/notebook');
		expect(team.excluded).toBe(false);
	});

	it('should allow modification through convenience setters', () => {
		team.name = 'Updated Team';
		team.city = 'Updated City';
		team.grade = 'College';
		team.notebookLink = 'https://example.com/new-notebook';
		team.excluded = true;

		expect(team.name).toBe('Updated Team');
		expect(team.city).toBe('Updated City');
		expect(team.grade).toBe('College');
		expect(team.notebookLink).toBe('https://example.com/new-notebook');
		expect(team.excluded).toBe(true);

		// Verify changes are reflected in the team's internal state
		expect(team.info.name).toBe('Updated Team');
		expect(team.data.notebookLink).toBe('https://example.com/new-notebook');
	});

	it('should not allow modification of readonly properties', () => {
		expect(team.number).toBe('123A');
		// Number should be readonly through the getter
	});
});

describe('EditingTeamList Class', () => {
	let teamList: EditingTeamList;
	let teams: EditingTeam[];

	beforeEach(() => {
		const teamId1 = uuidv4();
		const teamId2 = uuidv4();
		teams = [
			new EditingTeam(
				createTeamInfo(teamId1, '123A', 'Team A', 'City A', 'State A', 'Country A', 'TA', 'School A', 'High School', '123'),
				createTeamData(teamId1, 'https://example.com/notebook-a', null, false)
			),
			new EditingTeam(
				createTeamInfo(teamId2, '456B', 'Team B', 'City B', 'State B', 'Country B', 'TB', 'School B', 'Middle School', '456'),
				createTeamData(teamId2, 'https://example.com/notebook-b', null, false)
			)
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
		const newTeam = new EditingTeam(
			createTeamInfo(teamId3, '789C', 'Team C', 'City C', 'State C', 'Country C', 'TC', 'School C', 'College', '789'),
			createTeamData(teamId3, 'https://example.com/notebook-c', null, false)
		);

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

describe('parseNotebookData', () => {
	it('should parse valid TSV data with "team" and "notebook_link" columns', () => {
		const tsvData = `team\tnotebook_link
123A\thttps://example.com/notebook-a
456B\thttps://example.com/notebook-b`;

		const result = parseNotebookData(tsvData);

		expect(result).toEqual({
			'123A': 'https://example.com/notebook-a',
			'456B': 'https://example.com/notebook-b'
		});
	});

	it('should parse valid TSV data with "Team" and "Notebook Link" columns', () => {
		const tsvData = `Team\tNotebook Link
123A\thttps://example.com/notebook-a
456B\thttps://example.com/notebook-b`;

		const result = parseNotebookData(tsvData);

		expect(result).toEqual({
			'123A': 'https://example.com/notebook-a',
			'456B': 'https://example.com/notebook-b'
		});
	});

	it('should skip rows with "none" as notebook link', () => {
		const tsvData = `team\tnotebook_link
123A\thttps://example.com/notebook-a
456B\tnone
789C\thttps://example.com/notebook-c`;

		const result = parseNotebookData(tsvData);

		expect(result).toEqual({
			'123A': 'https://example.com/notebook-a',
			'789C': 'https://example.com/notebook-c'
		});
	});

	it('should skip rows with empty team numbers or links', () => {
		const tsvData = `team\tnotebook_link
123A\thttps://example.com/notebook-a
\thttps://example.com/notebook-b
456B\t`;

		const result = parseNotebookData(tsvData);

		expect(result).toEqual({
			'123A': 'https://example.com/notebook-a'
		});
	});

	it('should handle invalid team numbers gracefully', () => {
		const tsvData = `team\tnotebook_link
123a\thttps://example.com/notebook-a
456B\thttps://example.com/notebook-b`;

		// Should not throw but should warn about invalid team numbers
		const result = parseNotebookData(tsvData);

		expect(result).toEqual({
			'456B': 'https://example.com/notebook-b'
		});
	});

	it('should handle malformed TSV gracefully', () => {
		const tsvData = 'invalid tsv data';

		// The function should not throw for malformed TSV, but should return empty object
		const result = parseNotebookData(tsvData);
		expect(result).toEqual({});
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

describe('mergeTeamData', () => {
	it('should merge CSV teams with notebook links', () => {
		const csvTeams = [
			{
				number: '123A',
				name: 'Team Alpha',
				city: 'Alpha City',
				state: 'Alpha State',
				country: 'Alpha Country',
				shortName: 'TA',
				school: 'Alpha School',
				grade: 'High School' as Grade,
				group: '123',
				excluded: false
			},
			{
				number: '456B',
				name: 'Team Beta',
				city: 'Beta City',
				state: 'Beta State',
				country: 'Beta Country',
				shortName: 'TB',
				school: 'Beta School',
				grade: 'Middle School' as Grade,
				group: '456',
				excluded: false
			}
		];

		const notebookLinks = {
			'123A': 'https://example.com/notebook-a',
			'456B': 'https://example.com/notebook-b'
		};

		const result = mergeTeamData(csvTeams, notebookLinks);

		expect(result).toHaveLength(2);
		expect(result[0].number).toBe('123A');
		expect(result[0].name).toBe('Team Alpha');
		expect(result[0].notebookLink).toBe('https://example.com/notebook-a');
		expect(result[0].excluded).toBe(false);
		expect(result[1].number).toBe('456B');
		expect(result[1].name).toBe('Team Beta');
		expect(result[1].notebookLink).toBe('https://example.com/notebook-b');
		expect(result[1].excluded).toBe(false);
	});

	it('should handle missing notebook links', () => {
		const csvTeams = [
			{
				number: '123A',
				name: 'Team Alpha',
				city: 'Alpha City',
				state: 'Alpha State',
				country: 'Alpha Country',
				shortName: 'TA',
				school: 'Alpha School',
				grade: 'High School' as Grade,
				group: '123',
				excluded: false
			}
		];

		const notebookLinks = {};

		const result = mergeTeamData(csvTeams, notebookLinks);

		expect(result).toHaveLength(1);
		expect(result[0].number).toBe('123A');
		expect(result[0].notebookLink).toBe('');
	});

	it('should handle empty team data', () => {
		const csvTeams = [
			{
				number: '123A'
			}
		];

		const notebookLinks = {};

		const result = mergeTeamData(csvTeams, notebookLinks);

		expect(result).toHaveLength(1);
		expect(result[0].number).toBe('123A');
		expect(result[0].name).toBe('');
		expect(result[0].city).toBe('');
		expect(result[0].grade).toBe('College');
		expect(result[0].group).toBe('');
		expect(result[0].excluded).toBe(false);
		expect(result[0].data.isDevelopedNotebook).toBe(null);
	});

	it('should reuse existing team IDs when existing teams are provided', () => {
		const existingTeamId1 = uuidv4();
		const existingTeamId2 = uuidv4();

		const existingTeams = [
			new EditingTeam(
				createTeamInfo(
					existingTeamId1,
					'123A',
					'Old Team Alpha',
					'Old City',
					'Old State',
					'Old Country',
					'OTA',
					'Old School',
					'College',
					'123'
				),
				createTeamData(existingTeamId1, 'https://old-notebook.com', true, false)
			),
			new EditingTeam(
				createTeamInfo(
					existingTeamId2,
					'456B',
					'Old Team Beta',
					'Old Beta City',
					'Old Beta State',
					'Old Beta Country',
					'OTB',
					'Old Beta School',
					'Elementary School',
					'456'
				),
				createTeamData(existingTeamId2, 'https://old-beta-notebook.com', false, true)
			)
		];

		const csvTeams = [
			{
				number: '123A',
				name: 'New Team Alpha',
				city: 'New Alpha City',
				state: 'New Alpha State',
				country: 'New Alpha Country',
				shortName: 'NTA',
				school: 'New Alpha School',
				grade: 'High School' as Grade,
				group: '123',
				excluded: false
			},
			{
				number: '789C',
				name: 'Team Charlie',
				city: 'Charlie City',
				state: 'Charlie State',
				country: 'Charlie Country',
				shortName: 'TC',
				school: 'Charlie School',
				grade: 'Middle School' as Grade,
				group: '789',
				excluded: false
			}
		];

		const notebookLinks = {
			'123A': 'https://example.com/notebook-a',
			'789C': 'https://example.com/notebook-c'
		};

		const result = mergeTeamData(csvTeams, notebookLinks, existingTeams);

		expect(result).toHaveLength(2);

		// First team should reuse existing ID
		expect(result[0].id).toBe(existingTeamId1);
		expect(result[0].number).toBe('123A');
		expect(result[0].name).toBe('New Team Alpha'); // Should use new data
		expect(result[0].notebookLink).toBe('https://example.com/notebook-a');

		// Second team should get a new ID
		expect(result[1].id).not.toBe(existingTeamId1);
		expect(result[1].id).not.toBe(existingTeamId2);
		expect(result[1].number).toBe('789C');
		expect(result[1].name).toBe('Team Charlie');
		expect(result[1].notebookLink).toBe('https://example.com/notebook-c');
	});

	it('should handle isDevelopedNotebook field properly', () => {
		const csvTeams = [
			{
				number: '123A',
				name: 'Team Alpha',
				isDevelopedNotebook: true,
				excluded: false
			},
			{
				number: '456B',
				name: 'Team Beta',
				isDevelopedNotebook: false,
				excluded: true
			},
			{
				number: '789C',
				name: 'Team Charlie',
				// isDevelopedNotebook not specified (should default to null)
				excluded: false
			}
		];

		const notebookLinks = {};

		const result = mergeTeamData(csvTeams, notebookLinks);

		expect(result).toHaveLength(3);
		expect(result[0].data.isDevelopedNotebook).toBe(true);
		expect(result[0].excluded).toBe(false);
		expect(result[1].data.isDevelopedNotebook).toBe(false);
		expect(result[1].excluded).toBe(true);
		expect(result[2].data.isDevelopedNotebook).toBe(null);
		expect(result[2].excluded).toBe(false);
	});

	it('should handle mixed existing and new teams correctly', () => {
		const existingTeamId1 = uuidv4();
		const existingTeamId3 = uuidv4();

		const existingTeams = [
			new EditingTeam(
				createTeamInfo(
					existingTeamId1,
					'123A',
					'Existing Team Alpha',
					'City A',
					'State A',
					'Country A',
					'ETA',
					'School A',
					'High School',
					'123'
				),
				createTeamData(existingTeamId1, 'https://existing-notebook-a.com', null, false)
			),
			new EditingTeam(
				createTeamInfo(
					existingTeamId3,
					'789C',
					'Existing Team Charlie',
					'City C',
					'State C',
					'Country C',
					'ETC',
					'School C',
					'College',
					'789'
				),
				createTeamData(existingTeamId3, 'https://existing-notebook-c.com', true, false)
			)
		];

		const csvTeams = [
			{
				number: '123A',
				name: 'Updated Team Alpha',
				city: 'Updated City A',
				grade: 'High School' as Grade,
				group: '123'
			},
			{
				number: '456B',
				name: 'New Team Beta',
				city: 'City B',
				grade: 'Middle School' as Grade,
				group: '456'
			},
			{
				number: '789C',
				name: 'Updated Team Charlie',
				city: 'Updated City C',
				grade: 'College' as Grade,
				group: '789'
			}
		];

		const notebookLinks = {
			'456B': 'https://example.com/notebook-b'
		};

		const result = mergeTeamData(csvTeams, notebookLinks, existingTeams);

		expect(result).toHaveLength(3);

		// Team A should reuse existing ID
		expect(result[0].id).toBe(existingTeamId1);
		expect(result[0].number).toBe('123A');
		expect(result[0].name).toBe('Updated Team Alpha');

		// Team B should get new ID
		expect(result[1].id).not.toBe(existingTeamId1);
		expect(result[1].id).not.toBe(existingTeamId3);
		expect(result[1].number).toBe('456B');
		expect(result[1].name).toBe('New Team Beta');
		expect(result[1].notebookLink).toBe('https://example.com/notebook-b');

		// Team C should reuse existing ID
		expect(result[2].id).toBe(existingTeamId3);
		expect(result[2].number).toBe('789C');
		expect(result[2].name).toBe('Updated Team Charlie');
	});

	it('should generate new IDs for teams when no existing teams provided', () => {
		const csvTeams = [
			{
				number: '123A',
				name: 'Team Alpha',
				grade: 'High School' as Grade,
				group: '123'
			},
			{
				number: '456B',
				name: 'Team Beta',
				grade: 'Middle School' as Grade,
				group: '456'
			}
		];

		const notebookLinks = {};

		const result = mergeTeamData(csvTeams, notebookLinks);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBeDefined();
		expect(result[1].id).toBeDefined();
		expect(result[0].id).not.toBe(result[1].id);

		// Check that IDs are valid UUIDs (basic validation)
		expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		expect(result[1].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	it('should create correct EditingTeam instances with proper info and data objects', () => {
		const csvTeams = [
			{
				number: '123A',
				name: 'Team Alpha',
				city: 'Alpha City',
				state: 'Alpha State',
				country: 'Alpha Country',
				shortName: 'TA',
				school: 'Alpha School',
				grade: 'High School' as Grade,
				group: '123',
				excluded: true,
				isDevelopedNotebook: true
			}
		];

		const notebookLinks = {
			'123A': 'https://example.com/notebook-a'
		};

		const result = mergeTeamData(csvTeams, notebookLinks);

		expect(result).toHaveLength(1);
		const team = result[0];

		expect(team).toBeInstanceOf(EditingTeam);
		expect(team.info.id).toBe(team.data.id);
		expect(team.info.id).toBe(team.id);

		// Verify all info properties
		expect(team.info.number).toBe('123A');
		expect(team.info.name).toBe('Team Alpha');
		expect(team.info.city).toBe('Alpha City');
		expect(team.info.state).toBe('Alpha State');
		expect(team.info.country).toBe('Alpha Country');
		expect(team.info.shortName).toBe('TA');
		expect(team.info.school).toBe('Alpha School');
		expect(team.info.grade).toBe('High School');
		expect(team.info.group).toBe('123');

		// Verify all data properties
		expect(team.data.notebookLink).toBe('https://example.com/notebook-a');
		expect(team.data.excluded).toBe(true);
		expect(team.data.isDevelopedNotebook).toBe(true);

		// Verify convenience getters work
		expect(team.number).toBe('123A');
		expect(team.name).toBe('Team Alpha');
		expect(team.notebookLink).toBe('https://example.com/notebook-a');
		expect(team.excluded).toBe(true);
	});

	it('should handle empty arrays gracefully', () => {
		const result = mergeTeamData([], {}, []);
		expect(result).toEqual([]);

		const result2 = mergeTeamData([], {});
		expect(result2).toEqual([]);
	});
});

describe('groupTeamsByGroup', () => {
	let teams: EditingTeam[];

	beforeEach(() => {
		const teamIdA = uuidv4();
		const teamIdB = uuidv4();
		const teamIdC = uuidv4();
		const teamIdD = uuidv4();
		teams = [
			new EditingTeam(
				createTeamInfo(teamIdA, '123A', 'Team Alpha', 'City A', 'State A', 'Country A', 'TA', 'School A', 'High School', '123'),
				createTeamData(teamIdA, 'https://example.com/notebook-a', null, false)
			),
			new EditingTeam(
				createTeamInfo(teamIdB, '123B', 'Team Beta', 'City B', 'State B', 'Country B', 'TB', 'School B', 'High School', '123'),
				createTeamData(teamIdB, 'https://example.com/notebook-b', null, false)
			),
			new EditingTeam(
				createTeamInfo(teamIdC, '456C', 'Team Gamma', 'City C', 'State C', 'Country C', 'TC', 'School C', 'Middle School', '456'),
				createTeamData(teamIdC, 'https://example.com/notebook-c', null, false)
			),
			new EditingTeam(
				createTeamInfo(teamIdD, '789D', 'Team Delta', 'City D', 'State D', 'Country D', 'TD', 'School D', 'College', ''),
				createTeamData(teamIdD, 'https://example.com/notebook-d', null, false)
			)
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
		const teamsWithoutGroups = teams.map((team) => {
			team.group = '';
			return team;
		});

		const result = groupTeamsByGroup(teamsWithoutGroups);

		expect(Object.keys(result)).toHaveLength(1);
		expect(result['Ungrouped']).toHaveLength(4);
	});

	it('should group teams with all-letter team numbers correctly', () => {
		const appleId = uuidv4();
		const banana1Id = uuidv4();
		const banana2Id = uuidv4();
		const cherry3Id = uuidv4();
		const letterTeams = [
			new EditingTeam(
				createTeamInfo(appleId, 'APPLE', 'Team Apple', 'City A', 'State A', 'Country A', 'TA', 'School A', 'High School', 'APPLE'),
				createTeamData(appleId, 'https://example.com/notebook-apple', null, false)
			),
			new EditingTeam(
				createTeamInfo(banana1Id, 'BANANA1', 'Team Banana 1', 'City B', 'State B', 'Country B', 'TB1', 'School B', 'High School', 'BANANA'),
				createTeamData(banana1Id, 'https://example.com/notebook-banana1', null, false)
			),
			new EditingTeam(
				createTeamInfo(banana2Id, 'BANANA2', 'Team Banana 2', 'City C', 'State C', 'Country C', 'TB2', 'School C', 'High School', 'BANANA'),
				createTeamData(banana2Id, 'https://example.com/notebook-banana2', null, false)
			),
			new EditingTeam(
				createTeamInfo(
					cherry3Id,
					'CHERRY3',
					'Team Cherry 3',
					'City D',
					'State D',
					'Country D',
					'TC3',
					'School D',
					'Middle School',
					'CHERRY'
				),
				createTeamData(cherry3Id, 'https://example.com/notebook-cherry3', null, false)
			)
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
		const mixedTeams = [
			new EditingTeam(
				createTeamInfo(blrs1Id, 'BLRS1', 'BLRS Team 1', 'City A', 'State A', 'Country A', 'B1', 'School A', 'High School', 'BLRS'),
				createTeamData(blrs1Id, 'https://example.com/notebook-blrs1', null, false)
			),
			new EditingTeam(
				createTeamInfo(blrs2Id, 'BLRS2', 'BLRS Team 2', 'City B', 'State B', 'Country B', 'B2', 'School B', 'High School', 'BLRS'),
				createTeamData(blrs2Id, 'https://example.com/notebook-blrs2', null, false)
			),
			new EditingTeam(
				createTeamInfo(team99aId, 'TEAM99A', 'Team 99A', 'City C', 'State C', 'Country C', 'T99A', 'School C', 'Middle School', 'TEAM99'),
				createTeamData(team99aId, 'https://example.com/notebook-team99a', null, false)
			),
			new EditingTeam(
				createTeamInfo(team99bId, 'TEAM99B', 'Team 99B', 'City D', 'State D', 'Country D', 'T99B', 'School D', 'Middle School', 'TEAM99'),
				createTeamData(team99bId, 'https://example.com/notebook-team99b', null, false)
			),
			new EditingTeam(
				createTeamInfo(abc123xId, 'ABC123X', 'ABC 123 X', 'City E', 'State E', 'Country E', 'A123X', 'School E', 'College', 'ABC123'),
				createTeamData(abc123xId, 'https://example.com/notebook-abc123x', null, false)
			)
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
});
