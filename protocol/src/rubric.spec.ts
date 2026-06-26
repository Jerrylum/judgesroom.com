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
	roundRubricScore,
	sumRubricScores,
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

describe('rubric score precision', () => {
	it('roundRubricScore normalizes floating-point drift', () => {
		expect(roundRubricScore(53.000000000004)).toBe(53);
	});

	it('sumRubricScores avoids accumulation drift', () => {
		const driftProneScores = Array.from({ length: 25 }, () => 2.1);
		const naiveSum = driftProneScores.reduce((sum, score) => sum + score, 0);
		expect(naiveSum).not.toBe(52.5);
		expect(sumRubricScores(driftProneScores)).toBe(52.5);
	});

	it('generateNotebookRubricScores produces valid one-decimal scores', () => {
		const rubric = generateNotebookRubricScores();
		expect(rubric).toHaveLength(NOTEBOOK_RUBRIC_CRITERIA_COUNT);
		for (let i = 0; i < rubric.length; i++) {
			const score = rubric[i];
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(notebookRubricConfig[i].maxPoints);
			expect(score).toBe(roundRubricScore(score));
		}
		expect(
			EngineeringNotebookRubricSchema.safeParse({
				id: '00000000-0000-4000-8000-000000000001',
				teamId: '00000000-0000-4000-8000-000000000002',
				judgeId: '00000000-0000-4000-8000-000000000003',
				rubric,
				notes: '',
				innovateAwardNotes: '',
				timestamp: Date.now()
			}).success
		).toBe(true);
	});

	it('generateTeamInterviewRubricScores produces valid one-decimal scores', () => {
		const rubric = generateTeamInterviewRubricScores();
		expect(rubric).toHaveLength(TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT);
		for (let i = 0; i < rubric.length; i++) {
			const score = rubric[i];
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(teamInterviewRubricConfig[i].maxPoints);
			expect(score).toBe(roundRubricScore(score));
		}
		expect(
			TeamInterviewRubricSchema.safeParse({
				id: '00000000-0000-4000-8000-000000000001',
				teamId: '00000000-0000-4000-8000-000000000002',
				judgeId: '00000000-0000-4000-8000-000000000003',
				rubric,
				notes: '',
				timestamp: Date.now()
			}).success
		).toBe(true);
	});
});
