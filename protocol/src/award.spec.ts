import { describe, it, expect } from 'vitest';
import {
	ProgramSchema,
	AwardTypeSchema,
	GradeSchema,
	AwardNameSchema,
	AwardSchema,
	type Award,
	isDesignAward,
	isExcellenceAward,
	getPairedExcellenceAwardName,
	getDesignExcellenceSwapZone,
	isDesignExcellenceSwapZone
} from './award';

describe('Awards Schema Validation', () => {
	describe('ProgramSchema', () => {
		it('should validate valid programs', () => {
			const validTypes = ['VURC', 'V5RC', 'VIQRC'];
			validTypes.forEach((type) => {
				expect(() => ProgramSchema.parse(type)).not.toThrow();
			});
		});

		it('should reject invalid programs', () => {
			const invalidTypes = ['', 'VRC', 'VEXU', 'invalid', 'vurc', 'v5rc'];
			invalidTypes.forEach((type) => {
				expect(() => ProgramSchema.parse(type)).toThrow();
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
				requireNotebook: true,
				requireTeamInterview: true
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should validate award with multiple grades', () => {
			const validAward: Award = {
				name: 'Design Award',
				type: 'judged',
				acceptedGrades: ['Elementary School', 'Middle School', 'High School', 'College'],
				winnersCount: 2,
				requireNotebook: false,
				requireTeamInterview: true
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should validate performance award', () => {
			const validAward: Award = {
				name: 'Tournament Champions',
				type: 'performance',
				acceptedGrades: ['High School'],
				winnersCount: 2,
				requireNotebook: false,
				requireTeamInterview: false
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});

		it('should validate volunteer nominated award', () => {
			const validAward: Award = {
				name: 'Sportsmanship Award',
				type: 'volunteer_nominated',
				acceptedGrades: ['Middle School'],
				winnersCount: 1,
				requireNotebook: false,
				requireTeamInterview: false
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
					requireNotebook: true,
					requireTeamInterview: true
				},
				{
					name: 'Excellence Award',
					type: 'invalid', // invalid type
					acceptedGrades: ['High School'],
					winnersCount: 1,
					requireNotebook: true,
					requireTeamInterview: true
				},
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: ['Invalid Grade'], // invalid grade
					winnersCount: 1,
					requireNotebook: true,
					requireTeamInterview: true
				},
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: ['High School'],
					winnersCount: 0, // invalid winners count
					requireNotebook: true,
					requireTeamInterview: true
				},
				{
					name: 'Excellence Award',
					type: 'judged',
					acceptedGrades: ['High School'],
					winnersCount: 10001, // too many winners
					requireNotebook: true,
					requireTeamInterview: true
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
				requireNotebook: true,
				requireTeamInterview: true
			};

			expect(() => AwardSchema.parse(validAward)).not.toThrow();
		});
	});
});

describe('Design Award helpers', () => {
	it('should identify design award names', () => {
		expect(isDesignAward('Design Award')).toBe(true);
		expect(isDesignAward('Design Award - Middle School')).toBe(true);
		expect(isDesignAward('Excellence Award')).toBe(false);
	});

	it('should pair design awards with excellence awards', () => {
		expect(getPairedExcellenceAwardName('Design Award')).toBe('Excellence Award');
		expect(getPairedExcellenceAwardName('Design Award - Middle School')).toBe('Excellence Award - Middle School');
	});

	it('should map design-excellence swap zones', () => {
		expect(getDesignExcellenceSwapZone('Excellence Award')).toBe('Design Award');
		expect(getDesignExcellenceSwapZone('Excellence Award - Middle School')).toBe('Design Award - Middle School');
		expect(getDesignExcellenceSwapZone('Design Award - Elementary School')).toBe('Design Award - Elementary School');
		expect(isDesignExcellenceSwapZone('Design Award')).toBe(true);
		expect(isDesignExcellenceSwapZone('Design Award - High School')).toBe(true);
		expect(isDesignExcellenceSwapZone('Innovate Award')).toBe(false);
	});

	it('should not confuse excellence and design awards', () => {
		expect(isExcellenceAward('Design Award')).toBe(false);
		expect(isDesignAward('Excellence Award - Middle School')).toBe(false);
	});
});
