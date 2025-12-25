import { describe, it, expect, beforeEach } from 'vitest';
import { AwardOptions, getOfficialAwardOptionsList, createCustomAwardOptions } from './award.svelte';
import { AwardSchema, type Program, type Grade } from '@judgesroom.com/protocol/src/award';

describe('AwardOptions Class', () => {
	let awardOptions: AwardOptions;

	beforeEach(() => {
		awardOptions = new AwardOptions(
			'Test Award',
			['V5RC', 'VURC'],
			['judged', 'performance'],
			['High School', 'College'],
			2,
			true,
			true,
			true,
			false
		);
	});

	it('should create AwardOptions instance with correct properties', () => {
		expect(awardOptions.name).toBe('Test Award');
		expect(awardOptions.possiblePrograms).toEqual(['V5RC', 'VURC']);
		expect(awardOptions.possibleTypes).toEqual(['judged', 'performance']);
		expect(awardOptions.selectedType).toBe('judged'); // First type in possibleTypes
		expect(awardOptions.acceptedGrades).toEqual(['High School', 'College']);
		expect(awardOptions.possibleWinners).toBe(2);
		expect(awardOptions.requireNotebook).toBe(true);
		expect(awardOptions.requireTeamInterview).toBe(true);
		expect(awardOptions.isOfficial).toBe(true);
		expect(awardOptions.isSelected).toBe(false);
	});

	it('should allow modification of mutable properties', () => {
		awardOptions.name = 'Updated Award';
		awardOptions.selectedType = 'performance';
		awardOptions.acceptedGrades = ['Middle School'];
		awardOptions.possibleWinners = 5;
		awardOptions.requireNotebook = false;
		awardOptions.requireTeamInterview = false;
		awardOptions.isSelected = true;

		expect(awardOptions.name).toBe('Updated Award');
		expect(awardOptions.selectedType).toBe('performance');
		expect(awardOptions.acceptedGrades).toEqual(['Middle School']);
		expect(awardOptions.possibleWinners).toBe(5);
		expect(awardOptions.requireNotebook).toBe(false);
		expect(awardOptions.requireTeamInterview).toBe(false);
		expect(awardOptions.isSelected).toBe(true);
	});

	it('should generate correct Award object', () => {
		const award = awardOptions.generateAward();

		expect(award).toEqual({
			name: 'Test Award',
			type: 'judged',
			acceptedGrades: ['High School', 'College'],
			winnersCount: 2,
			requireNotebook: true,
			requireTeamInterview: true
		});
	});

	it('should generate updated Award object after modifications', () => {
		awardOptions.name = 'Modified Award';
		awardOptions.selectedType = 'performance';
		awardOptions.acceptedGrades = ['Elementary School'];
		awardOptions.possibleWinners = 1;
		awardOptions.requireNotebook = false;
		awardOptions.requireTeamInterview = false;

		const award = awardOptions.generateAward();

		expect(award).toEqual({
			name: 'Modified Award',
			type: 'performance',
			acceptedGrades: ['Elementary School'],
			winnersCount: 1,
			requireNotebook: false,
			requireTeamInterview: false
		});
	});

	it('should handle single type in possibleTypes', () => {
		const singleTypeOptions = new AwardOptions(
			'Single Type Award',
			['V5RC'],
			['performance'],
			['High School'],
			1,
			false,
			false,
			true,
			true
		);

		expect(singleTypeOptions.selectedType).toBe('performance');
		expect(singleTypeOptions.possibleTypes).toEqual(['performance']);
	});

	it('should handle empty possibleTypes gracefully', () => {
		const emptyTypeOptions = new AwardOptions('Empty Type Award', ['V5RC'], [], ['High School'], 1, false, false, true, true);

		expect(emptyTypeOptions.possibleTypes).toEqual([]);
		expect(emptyTypeOptions.selectedType).toBeUndefined();
	});
});

describe('getOfficialAwardOptionsList', () => {
	describe('V5RC Competition', () => {
		it('should return correct awards for V5RC High School', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			expect(awards.length).toBeGreaterThan(0);

			// Check that all awards are applicable to V5RC and High School
			awards.forEach((award) => {
				expect(award.possiblePrograms).toContain('V5RC');
				expect(award.acceptedGrades).toContain('High School');
			});

			// Check for specific awards
			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions).toBeDefined();
			expect(tournamentChampions?.isSelected).toBe(true);

			const excellence = awards.find((a) => a.name === 'Excellence Award');
			expect(excellence).toBeDefined();
			expect(excellence?.requireNotebook).toBe(true);
		});

		it('should return correct awards for V5RC Middle School', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['Middle School']);

			expect(awards.length).toBeGreaterThan(0);

			// Check that all awards are applicable to V5RC and Middle School
			awards.forEach((award) => {
				expect(award.possiblePrograms).toContain('V5RC');
				expect(award.acceptedGrades).toContain('Middle School');
			});

			// Check for specific awards
			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions).toBeDefined();

			const robotSkills = awards.find((a) => a.name === 'Robot Skills Champion');
			expect(robotSkills).toBeDefined();
		});

		it('should return correct awards for V5RC College', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['College']);

			expect(awards.length).toBeGreaterThan(0);

			// Check that all awards are applicable to V5RC and College
			awards.forEach((award) => {
				expect(award.possiblePrograms).toContain('V5RC');
				expect(award.acceptedGrades).toContain('College');
			});

			// Check for specific awards
			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions).toBeDefined();

			const excellence = awards.find((a) => a.name === 'Excellence Award');
			expect(excellence).toBeDefined();
		});

		it('should return awards for V5RC mixed grades', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School', 'Middle School']);

			expect(awards.length).toBeGreaterThan(0);

			// Should include awards that accept either grade
			awards.forEach((award) => {
				expect(award.acceptedGrades.some((grade) => grade === 'High School' || grade === 'Middle School')).toBe(true);
			});
		});
	});

	describe('VIQRC Competition', () => {
		it('should return correct awards for VIQRC Elementary School', () => {
			const awards = getOfficialAwardOptionsList('VIQRC', ['Elementary School']);

			expect(awards.length).toBeGreaterThan(0);

			// Check that all awards are applicable to VIQRC and Elementary School
			awards.forEach((award) => {
				expect(award.possiblePrograms).toContain('VIQRC');
				expect(award.acceptedGrades).toContain('Elementary School');
			});

			// Check for specific VIQRC awards
			const teamworkChampion = awards.find((a) => a.name === 'Teamwork Champion Award');
			expect(teamworkChampion).toBeDefined();
			expect(teamworkChampion?.isSelected).toBe(true);

			const createAward = awards.find((a) => a.name === 'Create Award');
			expect(createAward).toBeDefined();
		});

		it('should return correct awards for VIQRC Middle School', () => {
			const awards = getOfficialAwardOptionsList('VIQRC', ['Middle School']);

			expect(awards.length).toBeGreaterThan(0);

			// Check that all awards are applicable to VIQRC and Middle School
			awards.forEach((award) => {
				expect(award.possiblePrograms).toContain('VIQRC');
				expect(award.acceptedGrades).toContain('Middle School');
			});

			// Check for specific VIQRC awards
			const teamworkChampion = awards.find((a) => a.name === 'Teamwork Champion Award');
			expect(teamworkChampion).toBeDefined();

			const robotSkills = awards.find((a) => a.name === 'Robot Skills Champion');
			expect(robotSkills).toBeDefined();
		});

		it('should include VIQRC-specific Create Award', () => {
			const awards = getOfficialAwardOptionsList('VIQRC', ['Elementary School']);

			const createAward = awards.find((a) => a.name === 'Create Award');
			expect(createAward).toBeDefined();
			expect(createAward?.acceptedGrades).toContain('Elementary School');
		});

		it('should not include V5RC-specific awards', () => {
			const awards = getOfficialAwardOptionsList('VIQRC', ['Elementary School']);

			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions).toBeUndefined();
		});
	});

	describe('VURC Competition', () => {
		it('should return correct awards for VURC College', () => {
			const awards = getOfficialAwardOptionsList('VURC', ['College']);

			expect(awards.length).toBeGreaterThan(0);

			// Check that all awards are applicable to VURC and College
			awards.forEach((award) => {
				expect(award.possiblePrograms).toContain('VURC');
				expect(award.acceptedGrades).toContain('College');
			});

			// Check for specific awards
			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions).toBeDefined();

			const excellence = awards.find((a) => a.name === 'Excellence Award');
			expect(excellence).toBeDefined();
		});

		it('should not include VIQRC-specific awards', () => {
			const awards = getOfficialAwardOptionsList('VURC', ['College']);

			const teamworkChampion = awards.find((a) => a.name === 'Teamwork Champion Award');
			expect(teamworkChampion).toBeUndefined();
		});
	});

	describe('Award Precedence and Selection', () => {
		it('should mark certain awards as selected by default', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			const selectedAwards = awards.filter((a) => a.isSelected);
			expect(selectedAwards.length).toBeGreaterThan(0);

			// Check specific awards that should be selected
			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions?.isSelected).toBe(true);

			const excellence = awards.find((a) => a.name === 'Excellence Award');
			expect(excellence?.isSelected).toBe(true);
		});

		it('should mark robot skills champion as selected', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['Middle School']);

			const robotSkills = awards.find((a) => a.name === 'Robot Skills Champion');
			expect(robotSkills?.isSelected).toBe(true);
		});

		it('should not mark optional awards as selected', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			const semifinalists = awards.find((a) => a.name === 'Tournament Semifinalists');
			expect(semifinalists?.isSelected).toBe(false);
		});
	});

	describe('Award Properties', () => {
		it('should set correct winner counts for performance awards', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			const tournamentChampions = awards.find((a) => a.name === 'Tournament Champions');
			expect(tournamentChampions?.possibleWinners).toBe(2);

			const semifinals = awards.find((a) => a.name === 'Tournament Semifinalists');
			expect(semifinals?.possibleWinners).toBe(4);
		});

		it('should set correct notebook requirements', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			const excellence = awards.find((a) => a.name === 'Excellence Award');
			expect(excellence?.requireNotebook).toBe(true);

			const judgesAward = awards.find((a) => a.name === 'Judges Award');
			expect(judgesAward?.requireNotebook).toBe(false);
		});

		it('should set correct official status', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			awards.forEach((award) => {
				expect(award.isOfficial).toBe(true);
			});
		});
	});

	describe('Grade Filtering', () => {
		it('should filter out awards for non-matching grades', () => {
			const awards = getOfficialAwardOptionsList('VIQRC', ['College']);

			// Should not include elementary/middle school specific awards
			const teamworkChampion = awards.find((a) => a.name === 'Teamwork Champion Award');
			expect(teamworkChampion).toBeUndefined();
		});

		it('should handle empty grades array', () => {
			const awards = getOfficialAwardOptionsList('V5RC', []);

			expect(awards).toHaveLength(0);
		});

		it('should include grade-specific awards when multiple grades provided', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School', 'Middle School']);

			// Should include grade-specific awards when mixed grades (they match requirements)
			const hsExcellence = awards.find((a) => a.name === 'Excellence Award - High School');
			expect(hsExcellence).toBeDefined();

			const msExcellence = awards.find((a) => a.name === 'Excellence Award - Middle School');
			expect(msExcellence).toBeDefined();
		});

		it('should exclude grade-specific awards when only single grade provided', () => {
			const awards = getOfficialAwardOptionsList('V5RC', ['High School']);

			// Should exclude grade-specific awards when single grade (filter logic excludes single-grade awards for single grade)
			const hsExcellence = awards.find((a) => a.name === 'Excellence Award - High School');
			expect(hsExcellence).toBeUndefined();
		});
	});
});

describe('createCustomAwardOptions', () => {
	it('should create custom award options with correct properties', () => {
		const customAward = createCustomAwardOptions('My Custom Award', 'V5RC', 'judged', ['High School', 'College'], 3, true, true);

		expect(customAward.name).toBe('My Custom Award');
		expect(customAward.possiblePrograms).toEqual(['V5RC']);
		expect(customAward.possibleTypes).toEqual(['judged']);
		expect(customAward.selectedType).toBe('judged');
		expect(customAward.acceptedGrades).toEqual(['High School', 'College']);
		expect(customAward.possibleWinners).toBe(3);
		expect(customAward.requireNotebook).toBe(true);
		expect(customAward.requireTeamInterview).toBe(true);
		expect(customAward.isOfficial).toBe(false);
		expect(customAward.isSelected).toBe(true);
	});

	it('should create performance custom award', () => {
		const customAward = createCustomAwardOptions(
			'Custom Performance Award',
			'VIQRC',
			'performance',
			['Elementary School'],
			5,
			false,
			false
		);

		expect(customAward.name).toBe('Custom Performance Award');
		expect(customAward.possiblePrograms).toEqual(['VIQRC']);
		expect(customAward.selectedType).toBe('performance');
		expect(customAward.acceptedGrades).toEqual(['Elementary School']);
		expect(customAward.possibleWinners).toBe(5);
		expect(customAward.requireNotebook).toBe(false);
		expect(customAward.requireTeamInterview).toBe(false);
		expect(customAward.isOfficial).toBe(false);
		expect(customAward.isSelected).toBe(true);
	});

	it('should create volunteer nominated custom award', () => {
		const customAward = createCustomAwardOptions('Custom Volunteer Award', 'VURC', 'volunteer_nominated', ['College'], 1, false, false);

		expect(customAward.name).toBe('Custom Volunteer Award');
		expect(customAward.possiblePrograms).toEqual(['VURC']);
		expect(customAward.selectedType).toBe('volunteer_nominated');
		expect(customAward.acceptedGrades).toEqual(['College']);
		expect(customAward.possibleWinners).toBe(1);
		expect(customAward.requireNotebook).toBe(false);
		expect(customAward.requireTeamInterview).toBe(false);
		expect(customAward.isOfficial).toBe(false);
		expect(customAward.isSelected).toBe(true);
	});

	it('should generate correct Award object from custom options', () => {
		const customAward = createCustomAwardOptions('Test Custom Award', 'V5RC', 'judged', ['Middle School'], 2, true, true);

		const award = customAward.generateAward();

		expect(award).toEqual({
			name: 'Test Custom Award',
			type: 'judged',
			acceptedGrades: ['Middle School'],
			winnersCount: 2,
			requireNotebook: true,
			requireTeamInterview: true
		});
	});
});

describe('Integration Tests', () => {
	it('should create awards that validate against AwardSchema', () => {
		// Test official awards
		const officialAwards = getOfficialAwardOptionsList('V5RC', ['High School']);
		const excellence = officialAwards.find((a) => a.name === 'Excellence Award');

		if (excellence) {
			const award = excellence.generateAward();
			expect(() => AwardSchema.parse(award)).not.toThrow();
		}

		// Test custom awards
		const customAward = createCustomAwardOptions('Integration Test Award', 'V5RC', 'performance', ['High School'], 1, false, false);
		const award = customAward.generateAward();
		expect(() => AwardSchema.parse(award)).not.toThrow();
	});

	it('should handle all programs correctly', () => {
		const programs: Program[] = ['V5RC', 'VIQRC', 'VURC'];
		const grades: Grade[] = ['Elementary School', 'Middle School', 'High School', 'College'];

		programs.forEach((compType) => {
			grades.forEach((grade) => {
				const awards = getOfficialAwardOptionsList(compType, [grade]);

				awards.forEach((award) => {
					expect(award.possiblePrograms).toContain(compType);
					expect(award.acceptedGrades).toContain(grade);

					const generatedAward = award.generateAward();
					expect(() => AwardSchema.parse(generatedAward)).not.toThrow();
				});
			});
		});
	});

	it('should handle mixed grade scenarios correctly', () => {
		const mixedGrades: Grade[] = ['Middle School', 'High School'];
		const awards = getOfficialAwardOptionsList('V5RC', mixedGrades);

		awards.forEach((award) => {
			expect(award.acceptedGrades.some((grade) => mixedGrades.includes(grade))).toBe(true);
		});
	});
});
