import { z } from 'zod';

export const RubricPointSchema = z.number().min(0);

export type RubricRowConfig = {
	messageKeyPrefix: string;
	maxPoints: number;
	categoryKey?: string;
};

export type NotebookProficiencyHeaderScale = '3_2_1_0' | '5_3_2_0_1' | '4_3_2_0_1' | '4_3_2_1';

export type NotebookRubricSectionConfig<Scale extends string = string> = {
	categoryKey: string;
	sectionMaxPoints: number;
	proficiencyHeaderScale: Scale;
	criteria: RubricRowConfig[];
};

/** Normalize a score to one decimal place. */
export function roundRubricScore(score: number): number {
	return Math.round(score * 10) / 10;
}

export function formatRubricScore(score: number): string {
	return score.toFixed(1);
}

export function sumRubricScores(scores: number[]): number {
	const totalTenths = scores.reduce((sum, score) => sum + Math.round(score * 10), 0);
	return totalTenths / 10;
}

export function validateRubricArray(scores: number[], config: RubricRowConfig[], path: string, ctx: z.RefinementCtx) {
	if (scores.length !== config.length) {
		ctx.addIssue({
			code: 'custom',
			path: [path],
			message: `Expected ${config.length} rubric scores, received ${scores.length}`
		});
		return;
	}

	for (let i = 0; i < scores.length; i++) {
		const score = scores[i];
		const maxPoints = config[i].maxPoints;
		if (score < 0 || score > maxPoints) {
			ctx.addIssue({
				code: 'custom',
				path: [path, i],
				message: `Score must be between 0 and ${maxPoints}`
			});
		}
		const rounded = roundRubricScore(score);
		if (Math.abs(score - rounded) > 0.001) {
			ctx.addIssue({
				code: 'custom',
				path: [path, i],
				message: 'Score must have at most one decimal place'
			});
		}
	}
}

export function validateRubricPoint(score: number, maxPoints: number, path: (string | number)[], ctx: z.RefinementCtx) {
	if (score < 0 || score > maxPoints) {
		ctx.addIssue({
			code: 'custom',
			path,
			message: `Score must be between 0 and ${maxPoints}`
		});
	}
	const rounded = roundRubricScore(score);
	if (Math.abs(score - rounded) > 0.001) {
		ctx.addIssue({
			code: 'custom',
			path,
			message: 'Score must have at most one decimal place'
		});
	}
}
