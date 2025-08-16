import { describe, it, expect } from 'vitest';
import { type CompetitionType } from '@judging.jerryio/protocol/src/award';
import { EventGradeLevelSchema, EventNameSchema, EssentialDataSchema, type EssentialData } from '@judging.jerryio/protocol/src/event';
import { uuidv4 } from '@judging.jerryio/protocol/src/utils';
import { getEventGradeLevelOptions } from './event.svelte';

describe('Event Grade Level Options', () => {
	describe('V5RC Competition', () => {
		it('should return correct grade level options for V5RC', () => {
			const options = getEventGradeLevelOptions('V5RC');

			expect(options).toHaveLength(3);
			expect(options).toEqual([
				{
					value: 'MS Only',
					label: 'Middle School Only',
					grades: ['Middle School']
				},
				{
					value: 'HS Only',
					label: 'High School Only',
					grades: ['High School']
				},
				{
					value: 'Blended',
					label: 'Blended (MS & HS)',
					grades: ['Middle School', 'High School']
				}
			]);
		});

		it('should not include Elementary School grades', () => {
			const options = getEventGradeLevelOptions('V5RC');

			options.forEach((option) => {
				expect(option.grades).not.toContain('Elementary School');
			});
		});

		it('should not include College grades', () => {
			const options = getEventGradeLevelOptions('V5RC');

			options.forEach((option) => {
				expect(option.grades).not.toContain('College');
			});
		});
	});

	describe('VURC Competition', () => {
		it('should return correct grade level options for VURC', () => {
			const options = getEventGradeLevelOptions('VURC');

			expect(options).toHaveLength(1);
			expect(options).toEqual([
				{
					value: 'College Only',
					label: 'College Only',
					grades: ['College']
				}
			]);
		});

		it('should only include College grades', () => {
			const options = getEventGradeLevelOptions('VURC');

			expect(options[0].grades).toEqual(['College']);
		});
	});

	describe('Edge Cases', () => {
		it('should return empty array for invalid competition type', () => {
			const options = getEventGradeLevelOptions('InvalidType' as CompetitionType);

			expect(options).toEqual([]);
		});

		it('should handle all defined competition types', () => {
			const competitionTypes: CompetitionType[] = ['VIQRC', 'V5RC', 'VURC'];

			competitionTypes.forEach((type) => {
				const options = getEventGradeLevelOptions(type);
				expect(Array.isArray(options)).toBe(true);
				expect(options.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Grade Level Consistency', () => {
		it('should return valid EventGradeLevel values', () => {
			const allCompetitionTypes: CompetitionType[] = ['VIQRC', 'V5RC', 'VURC'];

			allCompetitionTypes.forEach((type) => {
				const options = getEventGradeLevelOptions(type);
				options.forEach((option) => {
					expect(() => EventGradeLevelSchema.parse(option.value)).not.toThrow();
				});
			});
		});

		it('should include all possible grade levels across all competition types', () => {
			const allOptions = [
				...getEventGradeLevelOptions('VIQRC'),
				...getEventGradeLevelOptions('V5RC'),
				...getEventGradeLevelOptions('VURC')
			];

			const uniqueGradeLevels = [...new Set(allOptions.map((option) => option.value))];

			expect(uniqueGradeLevels).toContain('ES Only');
			expect(uniqueGradeLevels).toContain('MS Only');
			expect(uniqueGradeLevels).toContain('HS Only');
			expect(uniqueGradeLevels).toContain('Blended');
			expect(uniqueGradeLevels).toContain('College Only');
		});

		it('should have consistent labeling', () => {
			const allCompetitionTypes: CompetitionType[] = ['VIQRC', 'V5RC', 'VURC'];

			allCompetitionTypes.forEach((type) => {
				const options = getEventGradeLevelOptions(type);
				options.forEach((option) => {
					expect(option.label).toBeTruthy();
					expect(option.label.length).toBeGreaterThan(0);
					expect(option.label.includes('Only') || option.label.includes('Blended')).toBe(true);
				});
			});
		});
	});

	describe('Blended Grade Logic', () => {
		it('should have multiple grades for blended options', () => {
			const viqrcOptions = getEventGradeLevelOptions('VIQRC');
			const v5rcOptions = getEventGradeLevelOptions('V5RC');

			const viqrcBlended = viqrcOptions.find((option) => option.value === 'Blended');
			expect(viqrcBlended?.grades).toHaveLength(2);
			expect(viqrcBlended?.grades).toContain('Elementary School');
			expect(viqrcBlended?.grades).toContain('Middle School');

			const v5rcBlended = v5rcOptions.find((option) => option.value === 'Blended');
			expect(v5rcBlended?.grades).toHaveLength(2);
			expect(v5rcBlended?.grades).toContain('Middle School');
			expect(v5rcBlended?.grades).toContain('High School');
		});

		it('should have single grades for non-blended options', () => {
			const allCompetitionTypes: CompetitionType[] = ['VIQRC', 'V5RC', 'VURC'];

			allCompetitionTypes.forEach((type) => {
				const options = getEventGradeLevelOptions(type);
				options.forEach((option) => {
					if (option.value !== 'Blended') {
						expect(option.grades).toHaveLength(1);
					}
				});
			});
		});
	});
});

describe('Integration Tests', () => {
	it('should work with complete event setup workflow', () => {
		// Get grade level options for V5RC
		const gradeLevelOptions = getEventGradeLevelOptions('V5RC');
		const selectedGradeLevel = gradeLevelOptions.find((option) => option.value === 'HS Only');

		expect(selectedGradeLevel).toBeDefined();
		expect(selectedGradeLevel?.grades).toEqual(['High School']);

		// Create a complete event setup using the selected grade level
		const eventSetup: EssentialData = {
			eventName: 'Regional Championship',
			competitionType: 'V5RC',
			eventGradeLevel: selectedGradeLevel!.value,
			performanceAwards: [
				{
					name: 'Tournament Champions',
					type: 'performance',
					acceptedGrades: selectedGradeLevel!.grades,
					winnersCount: 2,
					requireNotebook: false
				}
			],
			judgedAwards: [
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: selectedGradeLevel!.grades,
					winnersCount: 1,
					requireNotebook: true
				}
			],
			volunteerNominatedAwards: [],
			teams: [
				{
					id: uuidv4(),
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
			],
			judgingMethod: 'assigned',
			judgeGroups: [
				{
					id: uuidv4(),
					name: 'Judge Group 1',
					assignedTeams: ['123A']
				}
			]
		};

		// Validate the complete event setup
		expect(() => EssentialDataSchema.parse(eventSetup)).not.toThrow();

		// Verify the event name validation
		expect(() => EventNameSchema.parse(eventSetup.eventName)).not.toThrow();

		// Verify the grade level validation
		expect(() => EventGradeLevelSchema.parse(eventSetup.eventGradeLevel)).not.toThrow();
	});

	it('should handle edge cases in complete workflow', () => {
		// Test with VIQRC blended setup
		const viqrcOptions = getEventGradeLevelOptions('VIQRC');
		const blendedOption = viqrcOptions.find((option) => option.value === 'Blended');

		expect(blendedOption).toBeDefined();
		expect(blendedOption?.grades).toEqual(['Elementary School', 'Middle School']);

		const eventSetup: EssentialData = {
			eventName: 'A',
			competitionType: 'VIQRC',
			eventGradeLevel: blendedOption!.value,
			performanceAwards: [],
			judgedAwards: [],
			volunteerNominatedAwards: [],
			teams: [],
			judgingMethod: 'walk_in',
			judgeGroups: [
				{
					id: uuidv4(),
					name: 'Default Group',
					assignedTeams: []
				}
			]
		};

		expect(() => EssentialDataSchema.parse(eventSetup)).not.toThrow();
	});
});
