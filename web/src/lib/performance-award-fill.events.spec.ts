import { describe, expect, it } from 'vitest';
import { mapIQPerformanceAwardWinners, mapV5PerformanceAwardWinners } from './performance-award-fill.ts';
import {
	getEventDivisionEliminationMatches,
	getEventDivisionFinalistRankings,
	getEventSkills,
	getRobotEventsClient,
	importFromRobotEvents
} from './robotevents-source.ts';

/**
 * Finished events whose published winners can be compared with this fill.
 * V5 is listed first, then VIQRC.
 */
const FINISHED_EVENT_SKUS = [
	'VE-V5-26-65665',
	'RE-V5RC-26-4288',
	'VE-V5-26-66819',
	'RE-V5RC-26-5000',
	'VE-V5-26-65668',
	'RE-VIQRC-26-4289',
	'RE-VIQRC-26-4999',
	'RE-VIQRC-26-4822'
] as const;

describe('performance award fill for finished events', () => {
	const client = getRobotEventsClient();

	it.each(FINISHED_EVENT_SKUS)(
		'%s',
		async (sku) => {
			const imported = await importFromRobotEvents(client, sku);
			const awards = imported.awardOptions
				.filter((award) => award.isSelected && award.selectedType === 'performance')
				.map((award) => award.generateAward());
			const roomTeams = imported.teamInfos.map((team) => ({ number: team.number, grade: team.grade }));
			const skills = await getEventSkills(client, imported.robotEventsEventId);
			const divisions = [];
			for (const division of imported.divisionInfos) {
				const result =
					imported.program === 'V5RC'
						? mapV5PerformanceAwardWinners({
								awards,
								matches: await getEventDivisionEliminationMatches(client, imported.robotEventsEventId, division.id),
								skills,
								roomTeams
							})
						: mapIQPerformanceAwardWinners({
								awards,
								finalists: await getEventDivisionFinalistRankings(client, imported.robotEventsEventId, division.id),
								skills,
								roomTeams
							});
				divisions.push({ division: division.name, result });
			}

			expect({
				eventName: imported.eventName,
				program: imported.program,
				eventGradeLevel: imported.eventGradeLevel,
				awards: awards.map((award) => ({ name: award.name, winnersCount: award.winnersCount })),
				divisions
			}).toMatchSnapshot();
		},
		20_000
	);
});
