import { describe, it, expect } from 'vitest';
import {
	TeamNumberSchema,
	TeamGroupNameSchema,
	TeamInfoSchema,
	TeamDataSchema,
	initialNotebookDevelopmentStatus,
	isScoredNotebook,
	notebookDevelopmentStatusAfterLinkChange,
	notebookDevelopmentStatusAfterMethodChange,
	notebookDevelopmentStatusForSetupSave
} from './team';
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
				hasInnovateAwardSubmissionForm: false,
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			};

			expect(() => TeamDataSchema.parse(validData)).not.toThrow();
		});

		it('should handle empty notebook link', () => {
			const validData = {
				id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
				notebookLink: '',
				hasInnovateAwardSubmissionForm: false,
				notebookDevelopmentStatus: 'undetermined',
				absent: true
			};

			expect(() => TeamDataSchema.parse(validData)).not.toThrow();
		});

		it('caps notebookLink at 200 characters', () => {
			const teamData = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				hasInnovateAwardSubmissionForm: false,
				notebookDevelopmentStatus: 'undetermined' as const,
				absent: false
			};
			expect(TeamDataSchema.safeParse({ ...teamData, notebookLink: 'a'.repeat(200) }).success).toBe(true);
			expect(TeamDataSchema.safeParse({ ...teamData, notebookLink: 'a'.repeat(201) }).success).toBe(false);
		});

		it('accepts notebook link broken', () => {
			expect(
				TeamDataSchema.safeParse({
					id: '550e8400-e29b-41d4-a716-446655440000',
					notebookLink: 'https://example.com/notebook',
					hasInnovateAwardSubmissionForm: false,
					notebookDevelopmentStatus: 'notebook_link_broken',
					absent: false
				}).success
			).toBe(true);
		});
	});
});

describe('notebook development status rules', () => {
	it('starts a digital team with no link as not submitted', () => {
		expect(initialNotebookDevelopmentStatus('digital', '')).toBe('not_submitted');
		expect(initialNotebookDevelopmentStatus('digital', '  ')).toBe('not_submitted');
		expect(initialNotebookDevelopmentStatus('digital', 'https://notes.example')).toBe('undetermined');
		expect(initialNotebookDevelopmentStatus('physical', '')).toBe('undetermined');
	});

	it('clears an unscored digital notebook to not submitted and leaves scored notebooks', () => {
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://old.example',
				previousStatus: 'undetermined',
				nextLink: '',
				requestedStatus: 'undetermined'
			})
		).toBe('not_submitted');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://old.example',
				previousStatus: 'notebook_link_broken',
				nextLink: '   ',
				requestedStatus: 'notebook_link_broken'
			})
		).toBe('not_submitted');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://old.example',
				previousStatus: 'developing',
				nextLink: '',
				requestedStatus: 'not_submitted'
			})
		).toBe('developing');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://old.example',
				previousStatus: 'fully_developed',
				nextLink: '',
				requestedStatus: 'not_submitted'
			})
		).toBe('fully_developed');
	});

	it('returns a newly filled or replaced link to not reviewed', () => {
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: '',
				previousStatus: 'not_submitted',
				nextLink: 'https://notes.example',
				requestedStatus: 'not_submitted'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://broken.example',
				previousStatus: 'notebook_link_broken',
				nextLink: 'https://fixed.example',
				requestedStatus: 'notebook_link_broken'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: ' https://same.example ',
				previousStatus: 'notebook_link_broken',
				nextLink: 'https://same.example',
				requestedStatus: 'notebook_link_broken'
			})
		).toBe('notebook_link_broken');
	});

	it('keeps the requested status when the link does not change or the room is physical', () => {
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://notes.example',
				previousStatus: 'undetermined',
				nextLink: 'https://notes.example',
				requestedStatus: 'notebook_link_broken'
			})
		).toBe('notebook_link_broken');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'physical',
				previousLink: 'https://notes.example',
				previousStatus: 'undetermined',
				nextLink: '',
				requestedStatus: 'not_submitted'
			})
		).toBe('not_submitted');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://old.example',
				previousStatus: 'developing',
				nextLink: 'https://new.example',
				requestedStatus: 'developing'
			})
		).toBe('developing');
	});

	it('does not count a turned-in notebook as scored', () => {
		expect(isScoredNotebook('turned_in')).toBe(false);
		expect(isScoredNotebook('developing')).toBe(true);
		expect(isScoredNotebook('fully_developed')).toBe(true);
	});

	it('does not store turned in when a digital link changes', () => {
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'digital',
				previousLink: 'https://old.example',
				previousStatus: 'undetermined',
				nextLink: 'https://new.example',
				requestedStatus: 'turned_in'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterLinkChange({
				method: 'physical',
				previousLink: '',
				previousStatus: 'undetermined',
				nextLink: '',
				requestedStatus: 'turned_in'
			})
		).toBe('turned_in');
	});

	it('reconciles status when the submission method changes', () => {
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'digital',
				nextMethod: 'physical',
				notebookLink: 'https://notes.example',
				status: 'notebook_link_broken'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'digital',
				nextMethod: 'physical',
				notebookLink: '',
				status: 'developing'
			})
		).toBe('developing');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'physical',
				nextMethod: 'digital',
				notebookLink: '',
				status: 'undetermined'
			})
		).toBe('not_submitted');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'physical',
				nextMethod: 'digital',
				notebookLink: 'https://notes.example',
				status: 'not_submitted'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'physical',
				nextMethod: 'digital',
				notebookLink: '',
				status: 'fully_developed'
			})
		).toBe('fully_developed');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'physical',
				nextMethod: 'digital',
				notebookLink: '',
				status: 'turned_in'
			})
		).toBe('not_submitted');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'physical',
				nextMethod: 'digital',
				notebookLink: 'https://notes.example',
				status: 'turned_in'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'digital',
				nextMethod: 'physical',
				notebookLink: 'https://notes.example',
				status: 'turned_in'
			})
		).toBe('turned_in');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'digital',
				nextMethod: 'physical',
				notebookLink: 'https://notes.example',
				status: 'undetermined'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusAfterMethodChange({
				previousMethod: 'digital',
				nextMethod: 'digital',
				notebookLink: '',
				status: 'undetermined'
			})
		).toBe('undetermined');
	});

	it('uses the confirmed method for a new room and only reconciles a joined room when the method changes', () => {
		expect(
			notebookDevelopmentStatusForSetupSave({
				isNewRoom: true,
				previousMethod: 'digital',
				nextMethod: 'physical',
				notebookLink: '',
				status: 'not_submitted'
			})
		).toBe('undetermined');
		expect(
			notebookDevelopmentStatusForSetupSave({
				isNewRoom: false,
				previousMethod: 'digital',
				nextMethod: 'physical',
				notebookLink: '',
				status: 'not_submitted'
			})
		).toBe('not_submitted');
	});
});
