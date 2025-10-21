import type { Program, Grade } from '@judgesroom.com/protocol/src/award';
import type { EventGradeLevel } from '@judgesroom.com/protocol/src/event';

export interface EventGradeLevelOptions {
	value: EventGradeLevel;
	label: string;
	grades: Grade[];
}

export function getEventGradeLevelOptions(program: Program): EventGradeLevelOptions[] {
	switch (program) {
		case 'VIQRC':
			return [
				{
					value: 'ES Only',
					label: 'Elementary School Only',
					grades: ['Elementary School']
				},
				{ value: 'MS Only', label: 'Middle School Only', grades: ['Middle School'] },
				{
					value: 'Blended',
					label: 'Blended (ES & MS)',
					grades: ['Elementary School', 'Middle School']
				}
			];
		case 'V5RC':
			return [
				{ value: 'MS Only', label: 'Middle School Only', grades: ['Middle School'] },
				{ value: 'HS Only', label: 'High School Only', grades: ['High School'] },
				{
					value: 'Blended',
					label: 'Blended (MS & HS)',
					grades: ['Middle School', 'High School']
				}
			];
		case 'VURC':
			return [{ value: 'College Only', label: 'College Only', grades: ['College'] }];
		default:
			return [];
	}
}
