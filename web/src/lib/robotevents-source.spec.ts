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
	getRobotEventsClient,
	getEventDivisionRankings
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

		const allDivsAllGradesJoinedTeams = await getEventJoinedTeams(client, evtId);
		expect(allDivsAllGradesJoinedTeams.map((team) => team.id)).toMatchSnapshot();

		// Ordered by rank, also the teams "at the event"/"present" according to RECF Guide to Judging
		const allDivsAllGradesAllRankings = await getEventRankings(evt);
		expect(allDivsAllGradesAllRankings).toMatchSnapshot();

		// Ordered by overall score, teams that do not play skills are not included
		const allDivsAllGradesOverallSkills = await getEventSkills(client, evtId);
		expect(allDivsAllGradesOverallSkills).toMatchSnapshot();

		// Let's say all teams from division 1 are target
		const div1AllGradesRankings = filterRankingsByDivision(allDivsAllGradesAllRankings, 1);
		expect(div1AllGradesRankings).toMatchSnapshot();

		// Let's say all teams from middle school are target
		const allMiddleSchoolTeams = filterTeamsByGrade(allDivsAllGradesJoinedTeams, 'Middle School');
		expect(allMiddleSchoolTeams.length).toMatchSnapshot();

		const div1MiddleSchoolRankings = filterRankingsOrRecordsBySubset(div1AllGradesRankings, allMiddleSchoolTeams);
		expect(div1MiddleSchoolRankings).toMatchSnapshot();

		const allMiddleSchoolOverallSkills = filterRankingsOrRecordsBySubset(allDivsAllGradesOverallSkills, allMiddleSchoolTeams);
		expect(allMiddleSchoolOverallSkills).toMatchSnapshot();

		const result = getExcellenceAwardTeamEligibility(div1MiddleSchoolRankings, allMiddleSchoolOverallSkills);
		expect(result).toMatchSnapshot();

		// console.log(result);
		// console.log(result.length);
	});

	it('should get the correct event data with 1 division using getEventDivisionRankings', async () => {
		const resultEvt = await client.events.getBySKU('RE-VIQRC-24-8288'); // 58288

		if (!resultEvt.data) throw new Error('Event not found');
		const evt = resultEvt.data;
		const evtId = evt.id;

		const allDivsAllGradesJoinedTeams = await getEventJoinedTeams(client, evtId);
		expect(allDivsAllGradesJoinedTeams.map((team) => team.id)).toMatchSnapshot();

		// Let's say all teams from division 1 are target
		const div1AllGradesRankings = await getEventDivisionRankings(client, evtId, 1);
		expect(div1AllGradesRankings).toMatchSnapshot();

		// Ordered by overall score, teams that do not play skills are not included
		const allDivsAllGradesOverallSkills = await getEventSkills(client, evtId);
		expect(allDivsAllGradesOverallSkills).toMatchSnapshot();

		// Let's say all teams from middle school are target
		const allMiddleSchoolTeams = filterTeamsByGrade(allDivsAllGradesJoinedTeams, 'Middle School');
		expect(allMiddleSchoolTeams.length).toMatchSnapshot();

		const div1MiddleSchoolRankings = filterRankingsOrRecordsBySubset(div1AllGradesRankings, allMiddleSchoolTeams);
		expect(div1MiddleSchoolRankings).toMatchSnapshot();

		const allMiddleSchoolOverallSkills = filterRankingsOrRecordsBySubset(allDivsAllGradesOverallSkills, allMiddleSchoolTeams);
		expect(allMiddleSchoolOverallSkills).toMatchSnapshot();

		const result = getExcellenceAwardTeamEligibility(div1MiddleSchoolRankings, allMiddleSchoolOverallSkills);
		expect(result).toMatchSnapshot();
	});
});
