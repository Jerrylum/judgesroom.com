import { expect, describe, it, beforeEach } from 'vitest';
import { type VexEventsClient } from 'events.vex';
import {
	getEventRankings,
	getEventJoinedTeams,
	getEventSkills,
	filterTeamsByGrade,
	filterRankingsByDivision,
	getExcellenceAwardCandidatesReport,
	filterRankingsOrRecordsBySubset,
	getRobotEventsClient,
	getEventDivisionRankings,
	importFromRobotEvents,
	getEventDivisionExcellenceAwardCandidatesReport
} from './robotevents-source';

describe('RobotEventsSource', () => {
	let client: VexEventsClient;

	beforeEach(() => {
		client = getRobotEventsClient();
	});

	it('should get the correct event data with 1 division', async () => {
		// const events = await client.events.search({ 'sku[]': ['RE-VRC-23-1488'] });
		// RE-V5RC-25-0139
		// RE-VIQRC-25-0140

		// https://events.vex.com/RE-VRC-23-1488.html#results-
		// const resultEvt = await client.events.getBySKU('RE-VRC-23-1488');
		// https://events.vex.com/RE-VIQRC-24-8288.html#results-
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
		const allDivsMiddleSchoolTeams = filterTeamsByGrade(allDivsAllGradesJoinedTeams, 'Middle School');
		expect(allDivsMiddleSchoolTeams.length).toMatchSnapshot();

		const div1MiddleSchoolRankings = filterRankingsOrRecordsBySubset(div1AllGradesRankings, allDivsMiddleSchoolTeams);
		expect(div1MiddleSchoolRankings).toMatchSnapshot();

		const allDivsMiddleSchoolOverallSkills = filterRankingsOrRecordsBySubset(allDivsAllGradesOverallSkills, allDivsMiddleSchoolTeams);
		expect(allDivsMiddleSchoolOverallSkills).toMatchSnapshot();

		const result = getExcellenceAwardCandidatesReport(
			div1MiddleSchoolRankings,
			allDivsMiddleSchoolOverallSkills,
			allDivsMiddleSchoolTeams.length
		);
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

		const result = getExcellenceAwardCandidatesReport(div1MiddleSchoolRankings, allMiddleSchoolOverallSkills, allMiddleSchoolTeams.length);
		expect(result).toMatchSnapshot();
	});

	it('should get correct event data using importFromRobotEvents', async () => {
		const result = await importFromRobotEvents(client, 'RE-VIQRC-24-8288');

		expect({
			robotEventsSku: result.robotEventsSku,
			robotEventsEventId: result.robotEventsEventId,
			eventName: result.eventName,
			program: result.program,
			eventGradeLevel: result.eventGradeLevel,
			teamInfos: result.teamInfos.map((team) => ({ number: team.number })),
			awardsOptions: result.awardOptions.filter((award) => award.isSelected).map((award) => ({ name: award.name })),
			divisionInfos: result.divisionInfos
		}).toMatchSnapshot();
	});

	it('should get the correct event data with 1 division using getEventDivisionExcellenceAwardTeamEligibility', async () => {
		const imported = await importFromRobotEvents(client, 'RE-VIQRC-24-8288');

		const middleSchoolAwards = imported.awardOptions.filter((award) => award.name === 'Excellence Award - Middle School');

		const result = await getEventDivisionExcellenceAwardCandidatesReport(
			client,
			imported.robotEventsEventId,
			1,
			middleSchoolAwards.map((award) => award.generateAward())
		);
		expect(result).toMatchSnapshot();
	});
});

describe('getExcellenceAwardCandidatesReport auto skills eligibility', () => {
	it('should require autonomous coding skills score greater than zero', () => {
		const rankings = [
			{ teamNumber: '1A', divisionId: 1, rank: 1 },
			{ teamNumber: '2A', divisionId: 1, rank: 2 },
			{ teamNumber: '3A', divisionId: 1, rank: 3 },
			{ teamNumber: '4A', divisionId: 1, rank: 4 },
			{ teamNumber: '5A', divisionId: 1, rank: 5 }
		];
		const overallSkills = [
			{ teamNumber: '1A', rank: 1, overallScore: 100, programmingScore: 50, driverScore: 50 },
			{ teamNumber: '2A', rank: 2, overallScore: 90, programmingScore: 0, driverScore: 90 },
			{ teamNumber: '3A', rank: 3, overallScore: 80, programmingScore: 10, driverScore: 70 },
			{ teamNumber: '4A', rank: 4, overallScore: 70, programmingScore: 5, driverScore: 65 },
			{ teamNumber: '5A', rank: 5, overallScore: 60, programmingScore: 1, driverScore: 59 }
		];

		const result = getExcellenceAwardCandidatesReport(rankings, overallSkills, rankings.length);

		const team1A = result.teamsInGroup.find((team) => team.teamNumber === '1A');
		expect(team1A?.autoSkills.result).toBe('eligible');
		expect(team1A?.isEligible).toBe(true);

		const team2A = result.teamsInGroup.find((team) => team.teamNumber === '2A');
		expect(team2A?.autoSkills.result).toBe('ineligible');
		expect(team2A?.autoSkills.score).toBe(0);
		expect(team2A?.isEligible).toBe(false);
	});
});
