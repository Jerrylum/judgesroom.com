import { z } from 'zod';
import { type RubricRowConfig, RubricPointSchema, validateRubricArray } from './rubric-shared';

export const interview1_0RubricConfig: RubricRowConfig[] = [
	{ messageKeyPrefix: 'rubric_ti_engineering_design_process', maxPoints: 20 },
	{ messageKeyPrefix: 'rubric_ti_game_strategy', maxPoints: 15 },
	{ messageKeyPrefix: 'rubric_ti_robot_design', maxPoints: 15 },
	{ messageKeyPrefix: 'rubric_ti_robot_build', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_robot_code', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_project_management', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_teamwork_communication', maxPoints: 10 },
	{ messageKeyPrefix: 'rubric_ti_respect_courtesy', maxPoints: 10 }
];

export const INTERVIEW_1_0_CRITERIA_COUNT = interview1_0RubricConfig.length;
export const INTERVIEW_1_0_MAX_SCORE = interview1_0RubricConfig.reduce((sum, row) => sum + row.maxPoints, 0);

export const interview1_0RubricArraySchema = z.array(RubricPointSchema).length(INTERVIEW_1_0_CRITERIA_COUNT);

export function createEmptyInterview1_0Scores(): number[] {
	return Array(INTERVIEW_1_0_CRITERIA_COUNT).fill(-1);
}

function randomRubricScore(maxPoints: number): number {
	const tenths = Math.floor(Math.random() * (maxPoints * 10 + 1));
	return tenths / 10;
}

export function generateInterview1_0Scores(): number[] {
	return interview1_0RubricConfig.map((row) => randomRubricScore(row.maxPoints));
}

export function refineInterview1_0Scores(scores: number[], ctx: z.RefinementCtx) {
	validateRubricArray(scores, interview1_0RubricConfig, 'rubric', ctx);
}
