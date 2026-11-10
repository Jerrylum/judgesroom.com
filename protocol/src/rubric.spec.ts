import { describe, expect, it } from 'vitest';
import {
	EngineeringNotebookRubricSchema,
	NOTEBOOK_RUBRIC_CRITERIA_COUNT,
	NOTEBOOK_RUBRIC_MAX_SCORE,
	TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT,
	TEAM_INTERVIEW_RUBRIC_MAX_SCORE,
	TeamInterviewRubricSchema,
	generateNotebook2_0Scores,
	generateNotebookRubricScores,
	INTERVIEW_2_0_MAX_SCORE,
	generateInterview2_0Scores,
	generateTeamInterviewRubricScores,
	interview2_0ScoresToPayload,
	notebook2_0ScoresToPayload,
	notebookRubricConfig,
	roundRubricScore,
	roundRubricScoreToStep,
	sumInterviewRubric,
	sumNotebookRubric,
	sumRubricScores,
	teamInterviewRubricConfig,
	decodeInterviewRubric,
	decodeNotebookRubric
} from './rubric';

describe('rubric score steps', () => {
	it('snaps a score to the event step', () => {
		expect(roundRubricScoreToStep(2.4, 1)).toBe(2);
		expect(roundRubricScoreToStep(2.6, 1)).toBe(3);
		expect(roundRubricScoreToStep(1.2, 0.5)).toBe(1);
		expect(roundRubricScoreToStep(1.3, 0.5)).toBe(1.5);
		expect(roundRubricScoreToStep(0.3, 0.2)).toBe(0.4);
		expect(roundRubricScoreToStep(0.14, 0.1)).toBe(0.1);
	});
});

describe('GRSF rubric config', () => {
	it('has expected row counts', () => {
		expect(notebookRubricConfig).toHaveLength(NOTEBOOK_RUBRIC_CRITERIA_COUNT);
		expect(teamInterviewRubricConfig).toHaveLength(TEAM_INTERVIEW_RUBRIC_CRITERIA_COUNT);
	});

	it('notebook max score is 100', () => {
		expect(NOTEBOOK_RUBRIC_MAX_SCORE).toBe(100);
		expect(NOTEBOOK_RUBRIC_CRITERIA_COUNT).toBe(25);
	});

	it('interview 1.0 max score is 100', () => {
		expect(TEAM_INTERVIEW_RUBRIC_MAX_SCORE).toBe(100);
	});

	it('interview 2.0 max score is 12', () => {
		expect(INTERVIEW_2_0_MAX_SCORE).toBe(12);
	});
});

describe('GRSF rubric schemas', () => {
	const notebookSubmission = {
		id: '00000000-0000-4000-8000-000000000001',
		teamId: '00000000-0000-4000-8000-000000000002',
		judgeId: '00000000-0000-4000-8000-000000000003',
		rubric: generateNotebookRubricScores(),
		notes: '',
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

	it('does not cap notebook note length (stored in the room DO)', () => {
		const long = 'n'.repeat(50_000);
		expect(
			EngineeringNotebookRubricSchema.safeParse({
				...notebookSubmission,
				notes: long
			}).success
		).toBe(true);
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

describe('notebook rubric 2.0 payload', () => {
	it('decodes a 2.0 object and sums scores', () => {
		const scores = generateNotebook2_0Scores();
		const payload = notebook2_0ScoresToPayload(scores);
		expect(payload.rubricVersion).toBe('2.0');
		const decoded = decodeNotebookRubric(payload);
		expect(decoded?.version).toBe('2.0');
		expect(decoded?.scores).toEqual(scores);
		expect(sumNotebookRubric(payload)).toBe(sumRubricScores(scores));
	});

	it('accepts a 2.0 notebook submission', () => {
		const rubric = notebook2_0ScoresToPayload(generateNotebook2_0Scores());
		expect(
			EngineeringNotebookRubricSchema.safeParse({
				id: '00000000-0000-4000-8000-000000000001',
				teamId: '00000000-0000-4000-8000-000000000002',
				judgeId: '00000000-0000-4000-8000-000000000003',
				rubric,
				notes: '',
				timestamp: Date.now()
			}).success
		).toBe(true);
	});

	it('rejects an unknown object payload', () => {
		expect(decodeNotebookRubric({ rubricVersion: '3.0' })).toBeNull();
		expect(decodeNotebookRubric({ notebookOrganization: {} })).toBeNull();
	});
});

describe('interview rubric 2.0 payload', () => {
	it('decodes a 2.0 object and sums scores', () => {
		const scores = generateInterview2_0Scores();
		const payload = interview2_0ScoresToPayload(scores);
		expect(payload.rubricVersion).toBe('2.0');
		const decoded = decodeInterviewRubric(payload);
		expect(decoded?.version).toBe('2.0');
		expect(decoded?.scores).toEqual(scores);
		expect(sumInterviewRubric(payload)).toBe(sumRubricScores(scores));
	});

	it('accepts a 2.0 interview submission', () => {
		const rubric = interview2_0ScoresToPayload(generateInterview2_0Scores());
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

	it('decodes a 1.0 array payload', () => {
		const scores = generateTeamInterviewRubricScores();
		const decoded = decodeInterviewRubric(scores);
		expect(decoded?.version).toBe('1.0');
		expect(decoded?.scores).toEqual(scores);
		expect(sumInterviewRubric(scores)).toBe(sumRubricScores(scores));
	});

	it('rejects an unknown object payload', () => {
		expect(decodeInterviewRubric({ rubricVersion: '3.0' })).toBeNull();
		expect(decodeInterviewRubric({ explainYourLearning: {} })).toBeNull();
	});
});
