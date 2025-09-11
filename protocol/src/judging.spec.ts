import { describe, it, expect } from 'vitest';
import { JudgingMethodSchema, JudgeNameSchema, JudgeGroupNameSchema, JudgeSchema, JudgeGroupSchema } from './judging';
import { uuidv4 } from './utils';

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
				assignedTeams: ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-41d1-80b4-00c04fd430c8', '123e4567-e89b-42d3-a456-426614174000']
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
					assignedTeams: ['550e8400-e29b-41d4-a716-446655440000']
				},
				{
					id: uuidv4(),
					name: '', // empty name
					assignedTeams: ['550e8400-e29b-41d4-a716-446655440000']
				},
				{
					id: uuidv4(),
					name: ' Technical Judges ', // invalid name with spaces
					assignedTeams: ['550e8400-e29b-41d4-a716-446655440000']
				}
			];

			invalidGroups.forEach((group) => {
				expect(() => JudgeGroupSchema.parse(group)).toThrow();
			});
		});
	});
});
