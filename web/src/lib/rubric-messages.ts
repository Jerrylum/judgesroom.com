import { m } from '$lib/paraglide/messages.js';
import type { NotebookProficiencyHeaderScale } from '@judgesroom.com/protocol/src/rubric';

export type ProficiencyLevel = 'exemplary' | 'proficient' | 'developing' | 'beginning';

type MessageFn = () => string;
type MessageWithParamsFn = (params: { points: number }) => string;

function getMessage(key: string): MessageFn | undefined {
	const fn = (m as Record<string, unknown>)[key];
	return typeof fn === 'function' ? (fn as MessageFn) : undefined;
}

export function getRubricCriterionTitle(messageKeyPrefix: string): string {
	return getMessage(messageKeyPrefix)?.() ?? messageKeyPrefix;
}

export function getRubricCategoryTitle(categoryKey: string): string {
	return getMessage(categoryKey)?.() ?? categoryKey;
}

export function getRubricSectionHeading(categoryKey: string, sectionMaxPoints: number): string {
	const title = getRubricCategoryTitle(categoryKey);
	const pointsLabel = (m as Record<string, unknown>).rubric_nb_section_points;
	if (typeof pointsLabel === 'function') {
		return `${title} ${(pointsLabel as MessageWithParamsFn)({ points: sectionMaxPoints })}`;
	}
	return `${title} (${sectionMaxPoints} pts)`;
}

export function getRubricProficiencyHeader(
	scale: NotebookProficiencyHeaderScale,
	level: ProficiencyLevel
): string {
	return getMessage(`rubric_nb_hdr_${scale}_${level}`)?.() ?? '';
}

export function getRubricProficiencyText(messageKeyPrefix: string, level: ProficiencyLevel): string {
	return getMessage(`${messageKeyPrefix}_${level}`)?.() ?? '';
}
