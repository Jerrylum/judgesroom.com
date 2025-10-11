import { expect, describe, it, beforeEach } from 'vitest';
import { type RobotEventsClient } from 'robotevents';
import {
	getEventRankings,
	getEventJoinedTeams,
	getEventSkills,
	filterTeamsByGrade,
	filterRankingsByDivision,
	getExcellenceAwardTeamEligibility,
	filterRankingsOrRecordsBySubset,
	getRobotEventsClient
} from './robotevents-source';

describe('RobotEventsSource', () => {
	let client: RobotEventsClient;

	beforeEach(() => {
		client = getRobotEventsClient();
	});

	it('should get the correct event data with 1 division', async () => {
		// const events = await client.events.search({ 'sku[]': ['RE-VRC-23-1488'] });

		// https://www.robotevents.com/robot-competitions/vex-robotics-competition/RE-VRC-23-1488.html#results-
		// const resultEvt = await client.events.getBySKU('RE-VRC-23-1488');
		// https://www.robotevents.com/robot-competitions/vex-iq-competition/RE-VIQRC-24-8288.html#results-
		const resultEvt = await client.events.getBySKU('RE-VIQRC-24-8288'); // 58288

		if (!resultEvt.data) throw new Error('Event not found');

		const evt = resultEvt.data;
		const evtId = evt.id;

		const allDivsAllGradesAllJoinedTeams = await getEventJoinedTeams(client, evtId);
		expect(allDivsAllGradesAllJoinedTeams.map((team) => team.id)).toMatchSnapshot();

		// Ordered by rank, also the teams "at the event"/"present" according to RECF Guide to Judging
		const allDivsAllGradesAllRankings = await getEventRankings(evt);
		expect(allDivsAllGradesAllRankings).toMatchSnapshot();

		// Ordered by overall score, teams that do not play skills are not included
		const allDivsAllGradesAllTeamsOverallSkills = await getEventSkills(evt);
		expect(allDivsAllGradesAllTeamsOverallSkills).toMatchSnapshot();

		// Let's say all teams from division 1 are target
		const allDiv1Rankings = filterRankingsByDivision(allDivsAllGradesAllRankings, 1);
		expect(allDiv1Rankings).toMatchSnapshot();

		// Let's say all teams from middle school are target
		const allMiddleSchoolTeams = filterTeamsByGrade(allDivsAllGradesAllJoinedTeams, 'Middle School');
		expect(allMiddleSchoolTeams.length).toMatchSnapshot();

		const allDiv1MiddleSchoolRankings = filterRankingsOrRecordsBySubset(allDiv1Rankings, allMiddleSchoolTeams);
		expect(allDiv1MiddleSchoolRankings).toMatchSnapshot();

		const allDiv1MiddleSchoolOverallSkills = filterRankingsOrRecordsBySubset(allDivsAllGradesAllTeamsOverallSkills, allMiddleSchoolTeams);
		expect(allDiv1MiddleSchoolOverallSkills).toMatchSnapshot();

		const result = getExcellenceAwardTeamEligibility(allDiv1MiddleSchoolRankings, allDiv1MiddleSchoolOverallSkills);
		expect(result).toMatchSnapshot();

		// console.log(result);
		// console.log(result.length);
	});
});
