import { z } from 'zod';

export const JUDGE_GUIDE_VERSIONS = ['1.0', '2.0'] as const;
export type JudgeGuideVersion = (typeof JUDGE_GUIDE_VERSIONS)[number];

export const LATEST_JUDGE_GUIDE_VERSION: JudgeGuideVersion = '2.0';

export const JudgeGuideVersionSchema = z.enum(JUDGE_GUIDE_VERSIONS);

/** Null / unknown room pins are treated as 1.0 (pre-migration rooms). */
export function resolveJudgeGuideVersion(value: string | null | undefined): JudgeGuideVersion {
	if (value === '2.0') return '2.0';
	return '1.0';
}

export function isJudgeGuideVersionOlderThanLatest(value: string | null | undefined): boolean {
	return resolveJudgeGuideVersion(value) !== LATEST_JUDGE_GUIDE_VERSION;
}
