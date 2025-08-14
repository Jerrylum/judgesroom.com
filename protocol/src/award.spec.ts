import { describe, it, expect } from 'vitest';
import { CompetitionTypeSchema, AwardTypeSchema, GradeSchema, AwardNameSchema, AwardSchema, type Award } from './award';

describe('Awards Schema Validation', () => {
	describe('CompetitionTypeSchema', () => {
		it('should validate valid competition types', () => {
			const validTypes = ['VURC', 'V5RC', 'VIQRC'];
			validTypes.forEach((type) => {
				expect(() => CompetitionTypeSchema.parse(type)).not.toThrow();
			});
		});

		it('should reject invalid competition types', () => {
			const invalidTypes = ['', 'VRC', 'VEXU', 'invalid', 'vurc', 'v5rc'];
			invalidTypes.forEach((type) => {
				expect(() => CompetitionTypeSchema.parse(type)).toThrow();
			});
		});
	});

	describe('AwardTypeSchema', () => {
		it('should validate valid award types', () => {
			const validTypes = ['performance', 'judged', 'volunteer_nominated'];
			validTypes.forEach((type) => {
				expect(() => AwardTypeSchema.parse(type)).not.toThrow();
			});
		});

		it('should reject invalid award types', () => {
			const invalidTypes = ['', 'Performance', 'Judged', 'skill', 'custom'];
			invalidTypes.forEach((type) => {
				expect(() => AwardTypeSchema.parse(type)).toThrow();
			});
		});
	});

	describe('GradeSchema', () => {
		it('should validate valid grades', () => {
			const validGrades = ['Elementary School', 'Middle School', 'High School', 'College'];
			validGrades.forEach((grade) => {
				expect(() => GradeSchema.parse(grade)).not.toThrow();
			});
		});

		it('should reject invalid grades', () => {
			const invalidGrades = ['', 'elementary', 'middle', 'high', 'university', 'K-12'];
			invalidGrades.forEach((grade) => {
				expect(() => GradeSchema.parse(grade)).toThrow();
			});
		});
	});

	describe('AwardNameSchema', () => {
		it('should validate valid award names', () => {
			const validNames = [
				'Excellence Award',
				'Design Award',
				'A',
				'Tournament Champions',
				'My Custom Award 123',
				'Award-Name_With.Special/Chars'
			];
			validNames.forEach((name) => {
				expect(() => AwardNameSchema.parse(name)).not.toThrow();
			});
		});

		it('should reject invalid award names', () => {
			const invalidNames = [
				'', // empty
				' Excellence Award', // leading space
				'Excellence Award ', // trailing space
				' Excellence Award ', // leading and trailing spaces
				'A'.repeat(101), // too long (>100 chars)
				'\tAward', // leading tab
				'Award\n', // trailing newline
				'  ', // only spaces
				'\t\n' // only whitespace
			];
			invalidNames.forEach((name) => {
				expect(() => AwardNameSchema.parse(name)).toThrow();
			});
		});
	});

	describe('AwardSchema', () => {
		it('should validate complete award object', () => {
			const validAward: Award = {
				name: 'Excellence Award',
				type: 'judged',
				acceptedGrades: ['High School', 'College'],
				winnersCount: 1,
				requireNotebook: true
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should validate award with multiple grades', () => {
			const validAward: Award = {
				name: 'Design Award',
				type: 'judged',
				acceptedGrades: ['Elementary School', 'Middle School', 'High School', 'College'],
				winnersCount: 2,
				requireNotebook: false
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should validate performance award', () => {
			const validAward: Award = {
				name: 'Tournament Champions',
				type: 'performance',
				acceptedGrades: ['High School'],
				winnersCount: 2,
				requireNotebook: false
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should validate volunteer nominated award', () => {
			const validAward: Award = {
				name: 'Sportsmanship Award',
				type: 'volunteer_nominated',
				acceptedGrades: ['Middle School'],
				winnersCount: 1,
				requireNotebook: false
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should reject invalid award objects', () => {
			const invalidAwards = [
				{
					name: '', // empty name
					type: 'judged',
					acceptedGrades: ['High School'],
					winnersCount: 1,
					requireNotebook: true
				},
				{
					name: 'Excellence Award',
					type: 'invalid', // invalid type
					acceptedGrades: ['High School'],
					winnersCount: 1,
					requireNotebook: true
				},
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: ['Invalid Grade'], // invalid grade
					winnersCount: 1,
					requireNotebook: true
				},
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: ['High School'],
					winnersCount: 0, // invalid winners count
					requireNotebook: true
				},
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: ['High School'],
					winnersCount: 10001, // too many winners
					requireNotebook: true
				}
			];

			invalidAwards.forEach((award) => {
				expect(() => AwardSchema.parse(award)).toThrow();
			});
		});

		it('should allow award with empty accepted grades', () => {
			const validAward = {
				name: 'Excellence Award',
				type: 'judged',
				acceptedGrades: [], // empty array is allowed in current schema
				winnersCount: 1,
				requireNotebook: true
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});
	});
});
