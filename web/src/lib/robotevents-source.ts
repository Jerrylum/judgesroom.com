import { v4 as uuidv4 } from 'uuid';
import type { EventGradeLevel } from '@judging.jerryio/protocol/src/event';
import type { TeamInfo } from '@judging.jerryio/protocol/src/team';
import type { Award, Program } from '@judging.jerryio/protocol/src/award';
import { Client, type Division, type Event, type Grade, type RobotEventsClient, type Team, type TeamData } from 'robotevents';
import { extractGroupFromTeamNumber, type TeamInfoAndData } from './team.svelte';
import { getOfficialAwardOptionsList, type AwardOptions } from './award.svelte';
import { getEventGradeLevelOptions } from './event.svelte';

// This is a public token
const ROBOTEVENTS_TOKEN = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiMTdmMzZkZTUyOGI1ODE4YzMzMWY0YTM4YWE3MGYyMjNkYzdlNTY0OWQxMWFjZmZkNGFiZmU1NDM4NWYwYmQzMmUzNzIyY2RjODAyMjU5ZWQiLCJpYXQiOjE3NjAwMzA1NjMuMzA1MzkzOSwibmJmIjoxNzYwMDMwNTYzLjMwNTM5NjEsImV4cCI6MjcwNjcxNTM2My4yOTYyNzYxLCJzdWIiOiIxNTIwNzAiLCJzY29wZXMiOltdfQ.fU2Yb5sGBwWWQuXSPxTM7U0hPqr02hVUJnFiQBhlxGX3s6vwIiD9g7SBMH1Wmyhpwqw4a-9pmYYrFQV6tMX4MY2Aq7jUvieyTm5Jj763ybV_du_5lPQRMhCjpsJnWJ1YEMszqaKsUBleahlOOtdIjmSz3c3v6eEC-52rmrKNNf2Oke1vlufaCxjYl42MZxg8EFSKr2KK8_6FQ9jI8loXx9I51KV927Na3exdca09t80qqfFtsTo9BLja7YYw7WAuVozM9fZWe39zc0R2W9VpJO8LYVsNCF72J2SzGmoj5mkpFd1L2cxCWSeAw3qHSxdwsYRwf5WS25bu5qlA_z9mpGzFW-hYhDLTdkLLiwRUTCr7MUEiKvZmi8O8qb1J1od_Mh6oyesrW11QYoXze1BCgt-aExgn70_shiCGxMfZMIV32CzEFxE32YnqZx5eMrTgTqrVjsZ9EvQ-oyCkxYUUwhyy_JZDeywKs-aZU9uhG2-D8LYvDgemTAZMzcn0groFYgG23OVYFfCkrRDsji5D8Jna7Tvm5ogFz6J2GhJ8kCfpSYrmBI6dYcs34XDFcBJO9tPtiG8aURzVHlB8WpukqIBU7a04UqaYi5yWl9_G6Y51phuy64KFKor3jB08b-Pg66P5eN6yqRPRXXwy5flXjCVPe2Xxw3GERUBdbgLDxDw`;

export type TeamLike = { number: string };

export interface TeamQualRanking {
	teamNumber: string;
	divisionId: number;
	rank: number;
}

export interface TeamSkillsRecord {
	teamNumber: string;
	rank: number;
	driverScore: number;
	programmingScore: number;
	overallScore: number;
}

export interface ExcellenceAwardTeamEligibilityCriterion {
	result: 'eligible' | 'ineligible' | 'no data';
	// Here, "no" is unique and starts from 1, so it can be used to determine the eligibility
	// This is different from the "rank" in Tournament Manager
	// In some scenarios, the ranking of two teams are the same if their skills overall scores are the same
	// This is almost the same as the "rank" in RobotEvents API, except "no" can be 0 when there is no data
	no: number;
	score: number;
}

export interface ExcellenceAwardTeamEligibility {
	teamNumber: string;
	isEligible: boolean;
	qualRanking: ExcellenceAwardTeamEligibilityCriterion;
	overallSkills: ExcellenceAwardTeamEligibilityCriterion;
	autoSkills: ExcellenceAwardTeamEligibilityCriterion;
}

export interface ExcellenceAwardCandidatesReport {
	rankingEligibilityThreshold: number;
	skillsEligibilityThreshold: number;
	teamsInGroup: ExcellenceAwardTeamEligibility[];
	joinedTeamsInEventCount: number;
}

export interface DivisionInfo {
	id: number;
	name: string;
}

export interface RobotEventsImportedData {
	robotEventsSku: string;
	robotEventsEventId: number;
	eventName: string;
	program: Program;
	eventGradeLevel: EventGradeLevel;
	teamInfos: TeamInfoAndData[];
	awardOptions: AwardOptions[];
	divisionInfos: DivisionInfo[];
}

export function getRobotEventsClient(): RobotEventsClient {
	return Client({
		authorization: { token: ROBOTEVENTS_TOKEN }
	});
}

/**
 * Get the joined teams in the event
 *
 * Joined teams are teams that are in the team list on the event page on RobotEvents.
 * Sometimes, people call them "registered teams".
 *
 * In our implementation, we don't filter out teams using "registered" because this
 * "registered" is used to filter teams that paid registration fee on RobotEvents
 * this season. If this function is used for an event in a previous season with
 * teams that are not registered in the current season, the results will be
 * incorrect.
 *
 * @param client The RobotEvents client
 * @param evtId
 * @returns The joined teams in the event
 */
export async function getEventJoinedTeams(client: RobotEventsClient, evtId: number): Promise<TeamData[]> {
	const result = await client.api.PaginatedGET('/events/{id}/teams', {
		params: {
			path: {
				id: evtId
			}
		}
	});
	if (result.error) throw new Error('Failed to get event joined teams from RobotEvents');
	return result.data ?? [];
}

/**
 * Get the rankings of all teams in the event, in all divisions, a.k.a present teams
 *
 * If the events have multiple divisions, the rankings of all teams in all divisions are returned
 *
 * For example, if the event has 2 divisions:
 * - Division 1 Rank 1: Team 1
 * - Division 2 Rank 1: Team 3
 * - Division 1 Rank 2: Team 2
 * - Division 2 Rank 2: Team 4
 * ...
 *
 * @param evt The event
 * @returns The rankings of all teams in the event, ordered by rank, from the first place to the last place
 */
export async function getEventRankings(evt: Event): Promise<TeamQualRanking[]> {
	const rtn = [] as TeamQualRanking[];
	for (const division of evt.divisions ?? []) {
		const dId = division.id;
		if (!dId) continue;

		const result = await evt.rankings(dId);
		for (const ranking of result.data ?? []) {
			const teamNumber = ranking.team?.name;
			const divisionId = division.id;
			const rank = ranking.rank;
			if (!teamNumber || !divisionId || !rank) continue;
			rtn.push({ teamNumber, divisionId, rank });
		}
	}
	return rtn.sort((a, b) => a.rank - b.rank);
}

/**
 * Get the rankings of all teams in the division
 *
 * @param client The RobotEvents client
 * @param evtId The event ID
 * @param divisionId The division ID
 * @returns The rankings of all teams in the division, ordered by rank, from the first place to the last place
 */
export async function getEventDivisionRankings(client: RobotEventsClient, evtId: number, divisionId: number): Promise<TeamQualRanking[]> {
	const result = await client.api.PaginatedGET('/events/{id}/divisions/{div}/rankings', {
		params: {
			path: {
				id: evtId,
				div: divisionId
			}
		}
	});

	if (result.error) throw new Error('Failed to get event division rankings from RobotEvents');

	const rtn = [] as TeamQualRanking[];
	for (const ranking of result.data) {
		const teamId = ranking.team?.id;
		const teamName = ranking.team?.name;
		const rank = ranking.rank;
		if (!teamId || !teamName || !rank) continue;
		rtn.push({ teamNumber: teamName, divisionId, rank });
	}
	return rtn.sort((a, b) => a.rank - b.rank);
}

/**
 * Get the skills records of all teams in the event, in all divisions
 *
 * @param client The RobotEvents client
 * @param evtId The event ID
 * @returns The skills records of all teams in the event, ordered by rank, from the first place to the last place
 */
export async function getEventSkills(client: RobotEventsClient, evtId: number): Promise<TeamSkillsRecord[]> {
	const resultSkills = await client.api.PaginatedGET('/events/{id}/skills', {
		params: {
			path: {
				id: evtId
			}
		}
	});

	if (resultSkills.error) throw new Error('Failed to get event skills from RobotEvents');

	const validSkills = resultSkills.data
		.map((skill) => {
			const teamId = skill.team?.id;
			const teamNumber = skill.team?.name;
			const rank = skill.rank;
			const score = skill.score;
			const type = skill.type;
			if (
				teamId === undefined ||
				teamNumber === undefined ||
				rank === undefined ||
				score === undefined ||
				(type !== 'programming' && type !== 'driver')
			)
				return null;
			return { teamId, teamNumber, rank, score, type };
		})
		.filter((skill) => skill !== null);

	return Object.entries(Object.groupBy(validSkills, (skill) => skill.teamId))
		.map(([_, skills]) => {
			if (!skills || skills.length !== 2) return null;
			const driverScore = skills.filter((skill) => skill.type === 'driver').reduce((acc, skill) => acc + skill.score, 0);
			const programmingScore = skills.filter((skill) => skill.type === 'programming').reduce((acc, skill) => acc + skill.score, 0);
			const overallScore = driverScore + programmingScore;
			return {
				teamId: skills[0].teamId,
				teamNumber: skills[0].teamNumber,
				rank: skills[0].rank,
				driverScore,
				programmingScore,
				overallScore
			};
		})
		.filter((skill) => skill !== null)
		.sort((a, b) => a.rank - b.rank);
}

export function filterTeamsByGrade(teams: Readonly<Readonly<TeamData>[]>, grade: Grade): TeamData[] {
	return teams.filter((team) => team.grade === grade);
}

export function filterTeamsByGrades<T extends TeamInfo | TeamData>(teams: Readonly<Readonly<T>[]>, grades: Grade[]): T[] {
	return teams.filter((team) => grades.includes(team.grade ?? ('not provided' as Grade)));
}

export function filterRankingsByDivision(rankings: Readonly<Readonly<TeamQualRanking>[]>, divisionId: number): TeamQualRanking[] {
	return rankings.filter((ranking) => ranking.divisionId === divisionId);
}

export function filterRankingsOrRecordsBySubset<T extends TeamQualRanking | TeamSkillsRecord>(targets: T[], subset: TeamLike[]): T[] {
	const subsetIds = new Set(subset.map((team) => team.number));
	return targets.filter((target) => subsetIds.has(target.teamNumber));
}

/**
 * Get the Excellence Award candidates report for a group (division or event)
 *
 * The ranking eligibility threshold is calculated based on the number of joined teams in the specified group (division or event).
 * The skills eligibility threshold is calculated based on the number of joined teams in the event.
 *
 * @param rankings The rankings of all teams in the group (division or event)
 * @param overallSkills The overall skills of all teams in a division or in an event
 * @param joinedTeamsInEventCount The number of joined teams in the event
 * @returns The Excellence Award candidates report
 */
export function getExcellenceAwardCandidatesReport(
	rankings: TeamQualRanking[],
	overallSkills: TeamSkillsRecord[],
	joinedTeamsInEventCount: number
): ExcellenceAwardCandidatesReport {
	const THRESHOLD = 0.4;

	const rankingEligibilityThresholdNo = Math.round(rankings.length * THRESHOLD);
	const skillsEligibilityThresholdNo = Math.round(joinedTeamsInEventCount * THRESHOLD);

	const autoSkills = [...overallSkills].sort((a, b) => b.programmingScore - a.programmingScore);

	const rtnTeams = [] as ExcellenceAwardTeamEligibility[];
	for (let qualRankingIndex = 0; qualRankingIndex < rankings.length; qualRankingIndex++) {
		const qualRanking = rankings[qualRankingIndex];
		const teamNumber = qualRanking.teamNumber;

		const overallSkillsIndex = overallSkills.findIndex((s) => s.teamNumber === teamNumber);
		const autoSkillsIndex = autoSkills.findIndex((s) => s.teamNumber === teamNumber);

		const qualRankingNo = qualRankingIndex + 1;
		const qualRankingEligibility: ExcellenceAwardTeamEligibilityCriterion = {
			result: qualRankingNo <= rankingEligibilityThresholdNo ? 'eligible' : 'ineligible',
			no: qualRankingNo,
			score: qualRankingNo
		};

		const overallSkillsNo = overallSkillsIndex + 1;
		const overallSkillsEligibility: ExcellenceAwardTeamEligibilityCriterion = {
			result: overallSkillsIndex === -1 ? 'no data' : overallSkillsNo <= skillsEligibilityThresholdNo ? 'eligible' : 'ineligible',
			no: overallSkillsNo,
			score: overallSkillsIndex === -1 ? 0 : overallSkills[overallSkillsIndex].overallScore
		};

		const autoSkillsNo = autoSkillsIndex + 1;
		const autoSkillsScore = autoSkillsIndex === -1 ? -1 : autoSkills[autoSkillsIndex].programmingScore;
		const autoSkillsEligibility: ExcellenceAwardTeamEligibilityCriterion = {
			result:
				autoSkillsIndex === -1
					? 'no data'
					: autoSkillsNo <= skillsEligibilityThresholdNo && autoSkillsScore > 0
						? 'eligible'
						: 'ineligible',
			no: autoSkillsNo,
			score: autoSkillsScore
		};

		rtnTeams.push({
			teamNumber,
			isEligible:
				qualRankingEligibility.result === 'eligible' &&
				overallSkillsEligibility.result === 'eligible' &&
				autoSkillsEligibility.result === 'eligible',
			qualRanking: qualRankingEligibility,
			overallSkills: overallSkillsEligibility,
			autoSkills: autoSkillsEligibility
		});
	}
	return {
		rankingEligibilityThreshold: rankingEligibilityThresholdNo,
		skillsEligibilityThreshold: skillsEligibilityThresholdNo,
		teamsInGroup: rtnTeams,
		joinedTeamsInEventCount: joinedTeamsInEventCount
	};
}

/**
 * Get the Excellence Award team eligibility for a group (division or event)
 *
 * The team info list is the list of all teams in the judging system.
 * If there are only one division, the team info list should be the same list as the one in the RobotEvents.
 * If there are more then one division, the team info list should be the same list as the specified division.
 * Otherwise, the results will be incorrect.
 *
 * This function can be only used to determine DIVISION SPECIFIC Excellence Award team eligibility, not EVENT WIDE.
 * Teams that are not in the team info list will be excluded from the results before calculating the 40% threshold.
 *
 * @param client The RobotEvents client
 * @param evtId The event ID
 * @param divisionId The division ID
 * @param teamsInGroup The team info, must be the superset of the teams in the division/event,
 * @param excellenceAwards The Excellence Awards to get the team eligibility for
 * @returns The Excellence Award candidates report
 */
export async function getEventDivisionExcellenceAwardCandidatesReport(
	client: RobotEventsClient,
	evtId: number,
	divisionId: number,
	teamsInGroup: Readonly<Readonly<TeamInfo>[]>,
	excellenceAwards: Award[]
): Promise<Record<string, ExcellenceAwardCandidatesReport>> {
	const evtResult = await client.events.get(evtId);
	if (!evtResult.data) throw new Error('Event not found');

	const allGradesTeamsRegistered = await getEventJoinedTeams(client, evtId);
	const allGradesRankingsInEvent = await getEventRankings(evtResult.data); // a.k.a present teams
	const allGradesRankingsInGroup = filterRankingsByDivision(allGradesRankingsInEvent, divisionId);
	const allGradesOverallSkillsInEvent = await getEventSkills(client, evtId);

	const rtn = {} as Record<string, ExcellenceAwardCandidatesReport>;
	for (const award of excellenceAwards) {
		const allTargetGradesTeamsInGroup = filterTeamsByGrades(teamsInGroup, award.acceptedGrades);

		const allTargetGradesRankingsInGroup = filterRankingsOrRecordsBySubset(allGradesRankingsInGroup, allTargetGradesTeamsInGroup);

		const allTargetGradesOverallSkillsInGroup = filterRankingsOrRecordsBySubset(allGradesOverallSkillsInEvent, allTargetGradesTeamsInGroup);

		const allTargetGradesTeamsRegistered = filterTeamsByGrades(allGradesTeamsRegistered, award.acceptedGrades);

		const allTargetGradesTeamsInEvent = filterRankingsOrRecordsBySubset(allGradesRankingsInEvent, allTargetGradesTeamsRegistered);

		rtn[award.name] = getExcellenceAwardCandidatesReport(
			allTargetGradesRankingsInGroup,
			allTargetGradesOverallSkillsInGroup,
			allTargetGradesTeamsInEvent.length
		);
	}

	return rtn;
}

export function convertProgramIdToProgram(programId: number): Program {
	switch (programId) {
		case 1:
			return 'V5RC';
		case 4:
			return 'VURC';
		case 41:
			return 'VIQRC';
		default:
			throw new Error('Invalid program ID');
	}
}

export function getEventGradeLevel(teams: TeamData[]): EventGradeLevel {
	if (teams.every((team) => team.grade === 'Elementary School')) return 'ES Only';
	if (teams.every((team) => team.grade === 'Middle School')) return 'MS Only';
	if (teams.every((team) => team.grade === 'High School')) return 'HS Only';
	if (teams.every((team) => team.grade === 'College')) return 'College Only';
	return 'Blended';
}

export async function importFromRobotEvents(client: RobotEventsClient, evtSku: string): Promise<RobotEventsImportedData> {
	const resultEvt = await client.events.getBySKU(evtSku);
	if (!resultEvt.data) throw new Error('Event not found');

	const evt = resultEvt.data;
	const robotEventsSku = evt.sku;
	const robotEventsEventId = evt.id;

	const eventName = evt.name;
	const program = convertProgramIdToProgram(evt.program.id);

	const teams = await getEventJoinedTeams(client, robotEventsEventId);

	const eventGradeLevel = getEventGradeLevel(teams);

	const gradeOptions = getEventGradeLevelOptions(program);
	const possibleGrades = gradeOptions.find((g) => g.value === eventGradeLevel)?.grades ?? [];

	const throwTeamError = (team: TeamData) => {
		throw new Error(`Unable to get team info from RobotEvents for team ${team.number} because it is missing required fields`);
	};

	const teamInfos = teams.map(
		(team) =>
			({
				id: uuidv4(),
				number: team.number,
				name: team.team_name ?? '(Not Provided)',
				city: team.location?.city ?? '(Not Provided)',
				state: team.location?.region ?? '',
				country: team.location?.country ?? '(Not Provided)',
				shortName: team.team_name ?? '(Not Provided)',
				school: team.organization ?? '(Not Provided)',
				grade: team.grade ?? throwTeamError(team),
				group: extractGroupFromTeamNumber(team.number),
				notebookLink: '',
				notebookDevelopmentStatus: 'undetermined',
				absent: false
			}) satisfies TeamInfoAndData
	);

	const resultAwards = await evt.awards();
	if (resultAwards.error) throw new Error('Failed to get awards from RobotEvents');

	const awards = resultAwards.data ?? [];
	// XXX: RobotEvents API returns the title of the "Teamwork 2nd Place  Award (VIQRC)" award with 2 spaces after the "2nd"
	const awardTitles = awards
		.map((a) => a.title)
		.filter((t) => t !== undefined)
		.map((t) => t.replace(/\s+/g, ' '));

	const awardsOptions = getOfficialAwardOptionsList(program, possibleGrades).map((a) => {
		if (a.name === 'Excellence Award') {
			a.isSelected = eventGradeLevel !== 'Blended';
		} else if (a.name.startsWith('Excellence Award')) {
			a.isSelected = eventGradeLevel === 'Blended';
		} else {
			a.isSelected = awardTitles.some((b) => b.includes(a.name));
		}
		return a;
	});

	const throwDivisionError = (division: Division) => {
		throw new Error(`Unable to get division info from RobotEvents for division ${division.id} because it is missing required fields`);
	};

	const divisionInfos =
		evt.divisions?.map((division) => ({
			id: division.id ?? throwDivisionError(division),
			name: division.name ?? throwDivisionError(division)
		})) ?? [];

	if (divisionInfos.length === 0) throw new Error('No divisions found in RobotEvents');

	return {
		robotEventsSku,
		robotEventsEventId,
		eventName,
		program,
		eventGradeLevel,
		teamInfos,
		awardOptions: awardsOptions,
		divisionInfos
	} satisfies RobotEventsImportedData;
}
