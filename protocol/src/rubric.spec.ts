import { describe, expect, it } from 'vitest';
import {
	EngineeringNotebookRubricSchema,
	NOTEBOOK_RUBRIC_CRITERIA_COUNT,
	NOTEBOOK_RUBRIC_MAX_SCORE,
	TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT,
	TEAM_INTERVIEW_RUBRIC_MAX_SCORE,
	TeamInterviewRubricSchema,
	generateNotebookRubricScores,
	generateTeamInterviewRubricScores,
	notebookRubricConfig,
	teamInterviewRubricConfig
} from './rubric';

describe('GRSF rubric config', () => {
	it('has expected row counts', () => {
		expect(notebookRubricConfig).toHaveLength(NOTEBOOK_RUBRIC_CRITERIA_COUNT);
		expect(teamInterviewRubricConfig).toHaveLength(TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT);
	});

	it('notebook max score is 100', () => {
		expect(NOTEBOOK_RUBRIC_MAX_SCORE).toBe(100);
		expect(NOTEBOOK_RUBRIC_CRITERIA_COUNT).toBe(25);
	});

	it('interview max score is 100', () => {
		expect(TEAM_INTERVIEW_RUBRIC_MAX_SCORE).toBe(100);
	});
});

describe('GRSF rubric schemas', () => {
	const notebookSubmission = {
		id: '00000000-0000-4000-8000-000000000001',
		teamId: '00000000-0000-4000-8000-000000000002',
		judgeId: '00000000-0000-4000-8000-000000000003',
		rubric: generateNotebookRubricScores(),
		notes: '',
		innovateAwardNotes: '',
		timestamp: Date.now()
	};

	const interviewSubmission = {
		id: '00000000-0000-4000-8000-000000000001',
		teamId: '00000000-0000-4000-8000-000000000002',
		judgeId: '00000000-0000-4000-8000-000000000003',
		rubric: generateTeamInterviewRubricScores(),
		notes: '',
		timestamp: Date.now()
	};

	it('accepts valid notebook rubric', () => {
		expect(EngineeringNotebookRubricSchema.safeParse(notebookSubmission).success).toBe(true);
	});

	it('accepts valid interview rubric', () => {
		expect(TeamInterviewRubricSchema.safeParse(interviewSubmission).success).toBe(true);
	});

	it('rejects notebook rubric with wrong length', () => {
		const result = EngineeringNotebookRubricSchema.safeParse({
			...notebookSubmission,
			rubric: [1, 2, 3]
		});
		expect(result.success).toBe(false);
	});

	it('rejects scores above row max', () => {
		const rubric = generateNotebookRubricScores();
		rubric[0] = 99;
		const result = EngineeringNotebookRubricSchema.safeParse({
			...notebookSubmission,
			rubric
		});
		expect(result.success).toBe(false);
	});
});
