import { describe, it, expect } from 'vitest';
import { TeamNumberSchema, TeamGroupNameSchema, TeamInfoSchema, TeamDataSchema } from './team';
import type { Grade } from './award';
import { uuidv4 } from './utils';

describe('Teams Schema Validation', () => {
	describe('TeamNumberSchema', () => {
		it('should validate correct team numbers', () => {
			const validNumbers = ['123A', 'ABCD', '1234E', 'ABC123', 'Z', '1', '12345ABCDE'];
			validNumbers.forEach((number) => {
				expect(() => TeamNumberSchema.parse(number)).not.toThrow();
			});
		});

		it('should reject invalid team numbers', () => {
			const invalidNumbers = [
				'', // empty
				'abc', // lowercase
				'123a', // lowercase
				'12345678901', // too long (>10 chars)
				'123-A', // special characters
				'123 A', // spaces
				'123@A', // special characters
				'123.A', // dots
				'ABC_123' // underscores
			];

			invalidNumbers.forEach((number) => {
				expect(() => TeamNumberSchema.parse(number)).toThrow();
			});
		});
	});

	describe('TeamGroupNameSchema', () => {
		it('should validate correct group names', () => {
			const validNames = ['Group1', 'A', 'Team ABC', 'Group-123', 'My Team Group'];
			validNames.forEach((name) => {
				expect(() => TeamGroupNameSchema.parse(name)).not.toThrow();
			});
		});

		it('should reject invalid group names', () => {
			const invalidNames = [
				'', // empty
				' Group1', // leading space
				'Group1 ', // trailing space
				' Group1 ', // leading and trailing spaces
				'A'.repeat(101), // too long (>100 chars)
				'\t Group1', // leading tab
				'Group1\n' // trailing newline
			];

			invalidNames.forEach((name) => {
				expect(() => TeamGroupNameSchema.parse(name)).toThrow();
			});
		});
	});

	describe('TeamInfoSchema', () => {
		it('should validate complete team info', () => {
			const validTeamInfo = {
				id: uuidv4(),
				number: '123A',
				name: 'Test Team',
				city: 'Test City',
				state: 'Test State',
				country: 'Test Country',
				shortName: 'TT',
				school: 'Test School',
				grade: 'High School' as Grade,
				group: 'TestGroup'
			};

			expect(() => TeamInfoSchema.parse(validTeamInfo)).not.toThrow();
		});

		it('should reject invalid team info', () => {
			const invalidTeamInfo = {
				id: 'not-a-uuid',
				number: 'invalid-number',
				name: 'Test Team',
				city: 'Test City',
				state: 'Test State',
				country: 'Test Country',
				shortName: 'TT',
				school: 'Test School',
				grade: 'Invalid Grade' as Grade,
				group: ' InvalidGroup '
			};

			expect(() => TeamInfoSchema.parse(invalidTeamInfo)).toThrow();
		});
	});

	describe('TeamDataSchema', () => {
		it('should validate team data', () => {
			const validData = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				notebookLink: 'https://example.com/notebook',
				excluded: false
			};

			expect(() => TeamDataSchema.parse(validData)).not.toThrow();
		});

		it('should handle empty notebook link', () => {
			const validData = {
				id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
				notebookLink: '',
				excluded: true
			};

			expect(() => TeamDataSchema.parse(validData)).not.toThrow();
		});
	});
});
