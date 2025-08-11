import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
	JudgingMethodSchema,
	JudgeNameSchema,
	JudgeGroupNameSchema,
	JudgeSchema,
	JudgeGroupSchema,
	type Judge,
	createJudge,
	JudgeGroupClass,
	createJudgeFromString,
	parseJudgeNamesFromInput,
	randomlyAssignTeamsToGroups,
	getJudgesInGroup
} from './judging.svelte';
import { Team, createTeamInfo, createTeamData } from './teams.svelte';

describe('Judging Schema Validation', () => {
	describe('JudgingMethodSchema', () => {
		it('should validate valid judging methods', () => {
			const validMethods = ['walk_in', 'assigned'];
			validMethods.forEach((method) => {
				expect(() => JudgingMethodSchema.parse(method)).not.toThrow();
			});
		});

		it('should reject invalid judging methods', () => {
			const invalidMethods = ['', 'random', 'manual', 'automatic', 'Walk_in', 'ASSIGNED'];
			invalidMethods.forEach((method) => {
				expect(() => JudgingMethodSchema.parse(method)).toThrow();
			});
		});
	});

	describe('JudgeNameSchema', () => {
		it('should validate valid judge names', () => {
			const validNames = ['John Doe', 'Jane Smith', 'A', 'Dr. Johnson', "Mary-Anne O'Connor", 'Judge #1', '김철수', 'José García'];
			validNames.forEach((name) => {
				expect(() => JudgeNameSchema.parse(name)).not.toThrow();
			});
		});

		it('should reject invalid judge names', () => {
			const invalidNames = [
				'', // empty
				' John Doe', // leading space
				'John Doe ', // trailing space
				' John Doe ', // leading and trailing spaces
				'A'.repeat(101), // too long (>100 chars)
				'\tJohn', // leading tab
				'John\n', // trailing newline
				'  ', // only spaces
				'\t\n' // only whitespace
			];
			invalidNames.forEach((name) => {
				expect(() => JudgeNameSchema.parse(name)).toThrow();
			});
		});
	});

	describe('JudgeGroupNameSchema', () => {
		it('should validate valid judge group names', () => {
			const validNames = ['Group A', 'Technical Judges', 'Design Panel', '1', 'Group-1', 'Judges_Team_Alpha', '裁判グループ1'];
			validNames.forEach((name) => {
				expect(() => JudgeGroupNameSchema.parse(name)).not.toThrow();
			});
		});

		it('should reject invalid judge group names', () => {
			const invalidNames = [
				'', // empty
				' Group A', // leading space
				'Group A ', // trailing space
				' Group A ', // leading and trailing spaces
				'A'.repeat(101), // too long (>100 chars)
				'\tGroup', // leading tab
				'Group\n', // trailing newline
				'  ', // only spaces
				'\t\n' // only whitespace
			];
			invalidNames.forEach((name) => {
				expect(() => JudgeGroupNameSchema.parse(name)).toThrow();
			});
		});
	});

	describe('JudgeSchema', () => {
		it('should validate complete judge object', () => {
			const validJudge = {
				id: uuidv4(),
				name: 'John Doe',
				groupId: uuidv4()
			};

			expect(() => JudgeSchema.parse(validJudge)).not.toThrow();
		});

		it('should reject invalid judge objects', () => {
			const invalidJudges = [
				{
					id: 'not-a-uuid',
					name: 'John Doe',
					groupId: uuidv4()
				},
				{
					id: uuidv4(),
					name: '', // empty name
					groupId: uuidv4()
				},
				{
					id: uuidv4(),
					name: 'John Doe',
					groupId: 'not-a-uuid'
				},
				{
					id: uuidv4(),
					name: ' John Doe ', // invalid name with spaces
					groupId: uuidv4()
				}
			];

			invalidJudges.forEach((judge) => {
				expect(() => JudgeSchema.parse(judge)).toThrow();
			});
		});
	});

	describe('JudgeGroupSchema', () => {
		it('should validate complete judge group object', () => {
			const validGroup = {
				id: uuidv4(),
				name: 'Technical Judges',
				assignedTeams: ['123A', '456B', '789C']
			};

			expect(() => JudgeGroupSchema.parse(validGroup)).not.toThrow();
		});

		it('should validate judge group with empty assigned teams', () => {
			const validGroup = {
				id: uuidv4(),
				name: 'Design Panel',
				assignedTeams: []
			};

			expect(() => JudgeGroupSchema.parse(validGroup)).not.toThrow();
		});

		it('should reject invalid judge group objects', () => {
			const invalidGroups = [
				{
					id: 'not-a-uuid',
					name: 'Technical Judges',
					assignedTeams: ['123A']
				},
				{
					id: uuidv4(),
					name: '', // empty name
					assignedTeams: ['123A']
				},
				{
					id: uuidv4(),
					name: 'Technical Judges',
					assignedTeams: ['123a'] // invalid team number
				},
				{
					id: uuidv4(),
					name: ' Technical Judges ', // invalid name with spaces
					assignedTeams: ['123A']
				}
			];

			invalidGroups.forEach((group) => {
				expect(() => JudgeGroupSchema.parse(group)).toThrow();
			});
		});
	});
});

describe('Judge Class', () => {
	let judge: Judge;
	const mockId = uuidv4();
	const mockGroupId = uuidv4();

	beforeEach(() => {
		judge = createJudge(mockId, 'John Doe', mockGroupId);
	});

	it('should create a Judge instance with correct properties', () => {
		expect(judge.id).toBe(mockId);
		expect(judge.name).toBe('John Doe');
		expect(judge.groupId).toBe(mockGroupId);
	});

	it('should allow modification of mutable properties', () => {
		judge.name = 'Jane Smith';
		judge.groupId = uuidv4();

		expect(judge.name).toBe('Jane Smith');
		expect(judge.groupId).not.toBe(mockGroupId);
	});

	it('should have readonly id property', () => {
		expect(judge.id).toBe(mockId);
		// TypeScript should prevent modification of id at compile time
		expect(typeof judge.id).toBe('string');
	});
});

describe('JudgeGroupClass', () => {
	let judgeGroup: JudgeGroupClass;
	let mockTeams: Team[];

	beforeEach(() => {
		judgeGroup = new JudgeGroupClass('Technical Judges');

		// Create mock teams
		mockTeams = [
			new Team(
				createTeamInfo(uuidv4(), '123A', 'Team Alpha', 'City A', 'State A', 'Country A', 'TA', 'School A', 'High School', '123'),
				createTeamData('https://example.com/notebook-a', false)
			),
			new Team(
				createTeamInfo(uuidv4(), '456B', 'Team Beta', 'City B', 'State B', 'Country B', 'TB', 'School B', 'Middle School', '456'),
				createTeamData('https://example.com/notebook-b', false)
			),
			new Team(
				createTeamInfo(uuidv4(), '789C', 'Team Gamma', 'City C', 'State C', 'Country C', 'TC', 'School C', 'College', '789'),
				createTeamData('https://example.com/notebook-c', false)
			)
		];
	});

	it('should create a JudgeGroupClass instance with correct properties', () => {
		expect(judgeGroup.name).toBe('Technical Judges');
		expect(judgeGroup.assignedTeams).toEqual([]);
		expect(typeof judgeGroup.id).toBe('string');
		expect(judgeGroup.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('should allow modification of name', () => {
		judgeGroup.name = 'Design Panel';
		expect(judgeGroup.name).toBe('Design Panel');
	});

	it('should assign teams correctly', () => {
		judgeGroup.assignTeam(mockTeams[0]);
		expect(judgeGroup.assignedTeams).toHaveLength(1);
		expect(judgeGroup.assignedTeams[0].id).toBe(mockTeams[0].id);

		judgeGroup.assignTeam(mockTeams[1]);
		expect(judgeGroup.assignedTeams).toHaveLength(2);
		expect(judgeGroup.assignedTeams[1].id).toBe(mockTeams[1].id);
	});

	it('should not assign duplicate teams', () => {
		judgeGroup.assignTeam(mockTeams[0]);
		judgeGroup.assignTeam(mockTeams[0]); // Try to assign same team again

		expect(judgeGroup.assignedTeams).toHaveLength(1);
		expect(judgeGroup.assignedTeams[0].id).toBe(mockTeams[0].id);
	});

	it('should unassign teams correctly', () => {
		judgeGroup.assignTeam(mockTeams[0]);
		judgeGroup.assignTeam(mockTeams[1]);
		judgeGroup.assignTeam(mockTeams[2]);

		expect(judgeGroup.assignedTeams).toHaveLength(3);

		judgeGroup.unassignTeam(mockTeams[1].id);
		expect(judgeGroup.assignedTeams).toHaveLength(2);
		expect(judgeGroup.assignedTeams.find((t) => t.id === mockTeams[1].id)).toBeUndefined();
		expect(judgeGroup.assignedTeams.find((t) => t.id === mockTeams[0].id)).toBeDefined();
		expect(judgeGroup.assignedTeams.find((t) => t.id === mockTeams[2].id)).toBeDefined();
	});

	it('should handle unassigning non-existent teams gracefully', () => {
		judgeGroup.assignTeam(mockTeams[0]);
		expect(judgeGroup.assignedTeams).toHaveLength(1);

		judgeGroup.unassignTeam('non-existent-id');
		expect(judgeGroup.assignedTeams).toHaveLength(1);
		expect(judgeGroup.assignedTeams[0].id).toBe(mockTeams[0].id);
	});

	it('should handle unassigning from empty group gracefully', () => {
		expect(judgeGroup.assignedTeams).toHaveLength(0);
		judgeGroup.unassignTeam(mockTeams[0].id);
		expect(judgeGroup.assignedTeams).toHaveLength(0);
	});
});

describe('createJudgeFromString', () => {
	it('should create judge with correct properties', () => {
		const groupId = uuidv4();
		const judge = createJudgeFromString('John Doe', groupId);

		expect(judge.name).toBe('John Doe');
		expect(judge.groupId).toBe(groupId);
		expect(typeof judge.id).toBe('string');
		expect(judge.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('should trim whitespace from name', () => {
		const groupId = uuidv4();
		const judge = createJudgeFromString('  John Doe  ', groupId);

		expect(judge.name).toBe('John Doe');
		expect(judge.groupId).toBe(groupId);
	});

	it('should handle empty string after trimming', () => {
		const groupId = uuidv4();
		const judge = createJudgeFromString('   ', groupId);

		expect(judge.name).toBe('');
		expect(judge.groupId).toBe(groupId);
	});
});

describe('parseJudgeNamesFromInput', () => {
	it('should parse comma-separated names', () => {
		const input = 'John Doe, Jane Smith, Bob Johnson';
		const names = parseJudgeNamesFromInput(input);

		expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
	});

	it('should parse newline-separated names', () => {
		const input = 'John Doe\nJane Smith\nBob Johnson';
		const names = parseJudgeNamesFromInput(input);

		expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
	});

	it('should parse mixed comma and newline separated names', () => {
		const input = 'John Doe, Jane Smith\nBob Johnson, Alice Williams';
		const names = parseJudgeNamesFromInput(input);

		expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams']);
	});

	it('should trim whitespace from names', () => {
		const input = '  John Doe  ,   Jane Smith   \n  Bob Johnson  ';
		const names = parseJudgeNamesFromInput(input);

		expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
	});

	it('should filter out empty names', () => {
		const input = 'John Doe, , Jane Smith,\n, Bob Johnson,';
		const names = parseJudgeNamesFromInput(input);

		expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
	});

	it('should handle empty input', () => {
		const names = parseJudgeNamesFromInput('');
		expect(names).toEqual([]);
	});

	it('should handle whitespace-only input', () => {
		const names = parseJudgeNamesFromInput('   \n  \t  ');
		expect(names).toEqual([]);
	});

	it('should handle single name', () => {
		const names = parseJudgeNamesFromInput('John Doe');
		expect(names).toEqual(['John Doe']);
	});
});

describe('randomlyAssignTeamsToGroups', () => {
	let mockTeams: Team[];
	let judgeGroups: JudgeGroupClass[];

	beforeEach(() => {
		// Create mock teams
		mockTeams = Array.from(
			{ length: 10 },
			(_, i) =>
				new Team(
					createTeamInfo(
						uuidv4(),
						`${100 + i}A`,
						`Team ${i + 1}`,
						`City ${i + 1}`,
						`State ${i + 1}`,
						`Country ${i + 1}`,
						`T${i + 1}`,
						`School ${i + 1}`,
						'High School',
						`${100 + i}`
					),
					createTeamData(`https://example.com/notebook-${i + 1}`, false)
				)
		);

		// Create judge groups
		judgeGroups = [new JudgeGroupClass('Group A'), new JudgeGroupClass('Group B'), new JudgeGroupClass('Group C')];
	});

	it('should assign all teams to groups', () => {
		randomlyAssignTeamsToGroups(mockTeams, judgeGroups);

		const totalAssignedTeams = judgeGroups.reduce((sum, group) => sum + group.assignedTeams.length, 0);
		expect(totalAssignedTeams).toBe(mockTeams.length);
	});

	it('should distribute teams as evenly as possible', () => {
		randomlyAssignTeamsToGroups(mockTeams, judgeGroups);

		const teamCounts = judgeGroups.map((group) => group.assignedTeams.length);
		const maxCount = Math.max(...teamCounts);
		const minCount = Math.min(...teamCounts);

		// With 10 teams and 3 groups, distribution should be [4, 3, 3] or [3, 4, 3] etc.
		expect(maxCount - minCount).toBeLessThanOrEqual(1);
	});

	it('should assign each team to exactly one group', () => {
		randomlyAssignTeamsToGroups(mockTeams, judgeGroups);

		const assignedTeamIds = new Set<string>();
		judgeGroups.forEach((group) => {
			group.assignedTeams.forEach((team) => {
				expect(assignedTeamIds.has(team.id)).toBe(false);
				assignedTeamIds.add(team.id);
			});
		});

		expect(assignedTeamIds.size).toBe(mockTeams.length);
	});

	it('should clear existing assignments before new assignment', () => {
		// Pre-assign some teams
		judgeGroups[0].assignTeam(mockTeams[0]);
		judgeGroups[1].assignTeam(mockTeams[1]);

		randomlyAssignTeamsToGroups(mockTeams, judgeGroups);

		// Check that all teams are still assigned (no duplicates or missing teams)
		const totalAssignedTeams = judgeGroups.reduce((sum, group) => sum + group.assignedTeams.length, 0);
		expect(totalAssignedTeams).toBe(mockTeams.length);
	});

	it('should handle empty teams array', () => {
		randomlyAssignTeamsToGroups([], judgeGroups);

		judgeGroups.forEach((group) => {
			expect(group.assignedTeams).toHaveLength(0);
		});
	});

	it('should handle empty judge groups array', () => {
		// Should not throw error
		expect(() => randomlyAssignTeamsToGroups(mockTeams, [])).not.toThrow();
	});

	it('should handle single judge group', () => {
		const singleGroup = [new JudgeGroupClass('Only Group')];
		randomlyAssignTeamsToGroups(mockTeams, singleGroup);

		expect(singleGroup[0].assignedTeams).toHaveLength(mockTeams.length);
	});

	it('should handle more groups than teams', () => {
		const manyGroups = Array.from({ length: 15 }, (_, i) => new JudgeGroupClass(`Group ${i + 1}`));

		randomlyAssignTeamsToGroups(mockTeams, manyGroups);

		const totalAssignedTeams = manyGroups.reduce((sum, group) => sum + group.assignedTeams.length, 0);
		expect(totalAssignedTeams).toBe(mockTeams.length);

		// Some groups should be empty
		const emptyGroups = manyGroups.filter((group) => group.assignedTeams.length === 0);
		expect(emptyGroups.length).toBe(manyGroups.length - mockTeams.length);
	});
});

describe('getJudgesInGroup', () => {
	let judges: Judge[];
	let groupIds: string[];

	beforeEach(() => {
		groupIds = [uuidv4(), uuidv4(), uuidv4()];

		judges = [
			createJudge(uuidv4(), 'John Doe', groupIds[0]),
			createJudge(uuidv4(), 'Jane Smith', groupIds[0]),
			createJudge(uuidv4(), 'Bob Johnson', groupIds[1]),
			createJudge(uuidv4(), 'Alice Williams', groupIds[1]),
			createJudge(uuidv4(), 'Charlie Brown', groupIds[2])
		];
	});

	it('should return judges in specified group', () => {
		const group0Judges = getJudgesInGroup(judges, groupIds[0]);
		expect(group0Judges).toHaveLength(2);
		expect(group0Judges.map((j) => j.name)).toEqual(['John Doe', 'Jane Smith']);

		const group1Judges = getJudgesInGroup(judges, groupIds[1]);
		expect(group1Judges).toHaveLength(2);
		expect(group1Judges.map((j) => j.name)).toEqual(['Bob Johnson', 'Alice Williams']);

		const group2Judges = getJudgesInGroup(judges, groupIds[2]);
		expect(group2Judges).toHaveLength(1);
		expect(group2Judges.map((j) => j.name)).toEqual(['Charlie Brown']);
	});

	it('should return empty array for non-existent group', () => {
		const nonExistentGroupId = uuidv4();
		const result = getJudgesInGroup(judges, nonExistentGroupId);
		expect(result).toEqual([]);
	});

	it('should handle empty judges array', () => {
		const result = getJudgesInGroup([], groupIds[0]);
		expect(result).toEqual([]);
	});

	it('should return all judges if they all belong to the same group', () => {
		const sameGroupJudges = judges.map((judge) => {
			judge.groupId = groupIds[0];
			return judge;
		});

		const result = getJudgesInGroup(sameGroupJudges, groupIds[0]);
		expect(result).toHaveLength(judges.length);
	});
});

describe('Integration Tests', () => {
	it('should create complete judging workflow', () => {
		// Create judge groups
		const group1 = new JudgeGroupClass('Technical Judges');
		const group2 = new JudgeGroupClass('Design Panel');

		// Create judges
		const judgeNames = parseJudgeNamesFromInput('John Doe, Jane Smith\nBob Johnson, Alice Williams');
		const judges1 = judgeNames.slice(0, 2).map((name) => createJudgeFromString(name, group1.id));
		const judges2 = judgeNames.slice(2).map((name) => createJudgeFromString(name, group2.id));
		const allJudges = [...judges1, ...judges2];

		// Create teams
		const teams = Array.from(
			{ length: 6 },
			(_, i) =>
				new Team(
					createTeamInfo(
						uuidv4(),
						`${100 + i}A`,
						`Team ${i + 1}`,
						`City ${i + 1}`,
						`State ${i + 1}`,
						`Country ${i + 1}`,
						`T${i + 1}`,
						`School ${i + 1}`,
						'High School',
						`${100 + i}`
					),
					createTeamData(`https://example.com/notebook-${i + 1}`, false)
				)
		);

		// Assign teams to groups
		randomlyAssignTeamsToGroups(teams, [group1, group2]);

		// Verify integration
		expect(group1.assignedTeams.length + group2.assignedTeams.length).toBe(teams.length);
		expect(getJudgesInGroup(allJudges, group1.id)).toHaveLength(2);
		expect(getJudgesInGroup(allJudges, group2.id)).toHaveLength(2);

		// Verify all judges are properly assigned
		allJudges.forEach((judge) => {
			expect(() =>
				JudgeSchema.parse({
					id: judge.id,
					name: judge.name,
					groupId: judge.groupId
				})
			).not.toThrow();
		});
	});

	it('should handle edge cases in complete workflow', () => {
		// Empty judges and teams
		const emptyGroups = [new JudgeGroupClass('Empty Group')];
		randomlyAssignTeamsToGroups([], emptyGroups);

		expect(emptyGroups[0].assignedTeams).toHaveLength(0);
		expect(getJudgesInGroup([], emptyGroups[0].id)).toHaveLength(0);

		// Single judge, single team
		const singleGroup = new JudgeGroupClass('Single Group');
		const singleJudge = createJudgeFromString('Solo Judge', singleGroup.id);
		const singleTeam = new Team(
			createTeamInfo(uuidv4(), '100A', 'Solo Team', 'City', 'State', 'Country', 'ST', 'School', 'High School', '100'),
			createTeamData('https://example.com/notebook', false)
		);

		randomlyAssignTeamsToGroups([singleTeam], [singleGroup]);

		expect(singleGroup.assignedTeams).toHaveLength(1);
		expect(singleGroup.assignedTeams[0].id).toBe(singleTeam.id);
		expect(getJudgesInGroup([singleJudge], singleGroup.id)).toHaveLength(1);
	});
});
