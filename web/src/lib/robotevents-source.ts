import { Client, type Event, type Grade, type RobotEventsClient, type Team } from 'robotevents';

// This is a public token
const ROBOTEVENTS_TOKEN = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiMTdmMzZkZTUyOGI1ODE4YzMzMWY0YTM4YWE3MGYyMjNkYzdlNTY0OWQxMWFjZmZkNGFiZmU1NDM4NWYwYmQzMmUzNzIyY2RjODAyMjU5ZWQiLCJpYXQiOjE3NjAwMzA1NjMuMzA1MzkzOSwibmJmIjoxNzYwMDMwNTYzLjMwNTM5NjEsImV4cCI6MjcwNjcxNTM2My4yOTYyNzYxLCJzdWIiOiIxNTIwNzAiLCJzY29wZXMiOltdfQ.fU2Yb5sGBwWWQuXSPxTM7U0hPqr02hVUJnFiQBhlxGX3s6vwIiD9g7SBMH1Wmyhpwqw4a-9pmYYrFQV6tMX4MY2Aq7jUvieyTm5Jj763ybV_du_5lPQRMhCjpsJnWJ1YEMszqaKsUBleahlOOtdIjmSz3c3v6eEC-52rmrKNNf2Oke1vlufaCxjYl42MZxg8EFSKr2KK8_6FQ9jI8loXx9I51KV927Na3exdca09t80qqfFtsTo9BLja7YYw7WAuVozM9fZWe39zc0R2W9VpJO8LYVsNCF72J2SzGmoj5mkpFd1L2cxCWSeAw3qHSxdwsYRwf5WS25bu5qlA_z9mpGzFW-hYhDLTdkLLiwRUTCr7MUEiKvZmi8O8qb1J1od_Mh6oyesrW11QYoXze1BCgt-aExgn70_shiCGxMfZMIV32CzEFxE32YnqZx5eMrTgTqrVjsZ9EvQ-oyCkxYUUwhyy_JZDeywKs-aZU9uhG2-D8LYvDgemTAZMzcn0groFYgG23OVYFfCkrRDsji5D8Jna7Tvm5ogFz6J2GhJ8kCfpSYrmBI6dYcs34XDFcBJO9tPtiG8aURzVHlB8WpukqIBU7a04UqaYi5yWl9_G6Y51phuy64KFKor3jB08b-Pg66P5eN6yqRPRXXwy5flXjCVPe2Xxw3GERUBdbgLDxDw`;

export function getRobotEventsClient(): RobotEventsClient {
	return Client({
		authorization: { token: ROBOTEVENTS_TOKEN }
	});
}

export async function getEventJoinedTeams(client: RobotEventsClient, evtId: number): Promise<Team[]> {
	// "RegisteredTeams" or "JoinedTeams" mean teams that are in the team list
	// Here, we still have "registered" set to undefined
	// Because this "registered" is used to filter teams that paid registration fee on RobotEvents this season

	// Both are identical

	// const result = await evt.teams({ registered: undefined });
	const result = await client.teams.search({ 'event[]': [evtId], registered: undefined });
	return result.data ?? [];
}

export interface TeamQualRanking {
	teamId: number;
	divisionId: number;
	rank: number;
}

export async function getEventRankings(evt: Event): Promise<TeamQualRanking[]> {
	const rtn = [] as TeamQualRanking[];
	for (const division of evt.divisions ?? []) {
		const dId = division.id;
		if (!dId) continue;

		const result = await evt.rankings(dId);
		for (const ranking of result.data ?? []) {
			const teamId = ranking.team?.id;
			const divisionId = division.id;
			const rank = ranking.rank;
			if (!teamId || !divisionId || !rank) continue;
			rtn.push({ teamId, divisionId, rank });
		}
	}
	return rtn.sort((a, b) => a.rank - b.rank);
}

export interface TeamSkillsRecord {
	teamId: number;
	rank: number;
	driverScore: number;
	programmingScore: number;
	overallScore: number;
}

export async function getEventSkills(evt: Event): Promise<TeamSkillsRecord[]> {
	const resultSkills = await evt.skills();
	if (!resultSkills.data) return [];

	const skills = resultSkills.data;

	const validSkills = skills
		.map((skill) => {
			const teamId = skill.team?.id;
			const rank = skill.rank;
			const score = skill.score;
			const type = skill.type;
			if (teamId === undefined || rank === undefined || score === undefined || (type !== 'programming' && type !== 'driver')) return null;
			return { teamId, rank, score, type };
		})
		.filter((skill) => skill !== null);

	return Object.entries(Object.groupBy(validSkills, (skill) => skill.teamId))
		.map(([_, skills]) => {
			if (!skills || skills.length !== 2) return null;
			const driverScore = skills.filter((skill) => skill.type === 'driver').reduce((acc, skill) => acc + skill.score, 0);
			const programmingScore = skills.filter((skill) => skill.type === 'programming').reduce((acc, skill) => acc + skill.score, 0);
			const overallScore = driverScore + programmingScore;
			return { teamId: skills[0].teamId, rank: skills[0].rank, driverScore, programmingScore, overallScore };
		})
		.filter((skill) => skill !== null)
		.sort((a, b) => a.rank - b.rank);
}

export function filterTeamsByGrade(teams: Team[], grade: Grade): Team[] {
	return teams.filter((team) => team.grade === grade);
}

export function filterRankingsByDivision(rankings: TeamQualRanking[], divisionId: number): TeamQualRanking[] {
	return rankings.filter((ranking) => ranking.divisionId === divisionId);
}

export function filterRankingsOrRecordsBySubset<T extends TeamQualRanking | TeamSkillsRecord>(targets: T[], subset: Team[]): T[] {
	const subsetIds = subset.map((team) => team.id);
	return targets.filter((target) => subsetIds.includes(target.teamId));
}

export interface ExcellenceAwardTeamEligibilityCriterion {
	result: 'eligible' | 'ineligible' | 'no data';
	no: number; // a.k.a "rank", calculated by index, starts from 1
	score: number;
}

export interface ExcellenceAwardTeamEligibility {
	teamId: number;
	isEligible: boolean;
	qualRanking: ExcellenceAwardTeamEligibilityCriterion;
	overallSkills: ExcellenceAwardTeamEligibilityCriterion;
	autoSkills: ExcellenceAwardTeamEligibilityCriterion;
}

export function getExcellenceAwardTeamEligibility(
	rankings: TeamQualRanking[],
	overallSkills: TeamSkillsRecord[]
): ExcellenceAwardTeamEligibility[] {
	const THRESHOLD = 0.4;

	const rankingsThresholdNo = Math.round(rankings.length * THRESHOLD) + 1;
	const overallSkillsThresholdNo = Math.round(overallSkills.length * THRESHOLD) + 1;

	const autoSkills = [...overallSkills].sort((a, b) => b.programmingScore - a.programmingScore);

	const rtn = [] as ExcellenceAwardTeamEligibility[];
	for (let qualRankingIndex = 0; qualRankingIndex < rankings.length; qualRankingIndex++) {
		const qualRanking = rankings[qualRankingIndex];
		const teamId = qualRanking.teamId;

		const overallSkillsIndex = overallSkills.findIndex((s) => s.teamId === teamId);
		const autoSkillsIndex = autoSkills.findIndex((s) => s.teamId === teamId);

		const qualRankingNo = qualRankingIndex + 1;
		const qualRankingEligibility: ExcellenceAwardTeamEligibilityCriterion = {
			result: qualRankingNo <= rankingsThresholdNo ? 'eligible' : 'ineligible',
			no: qualRankingNo,
			score: qualRankingNo
		};

		const overallSkillsNo = overallSkillsIndex + 1;
		const overallSkillsEligibility: ExcellenceAwardTeamEligibilityCriterion = {
			result: overallSkillsIndex === -1 ? 'no data' : overallSkillsNo <= overallSkillsThresholdNo ? 'eligible' : 'ineligible',
			no: overallSkillsNo,
			score: overallSkillsIndex === -1 ? 0 : overallSkills[overallSkillsIndex].overallScore
		};

		const autoSkillsNo = autoSkillsIndex + 1;
		const autoSkillsScore = autoSkillsIndex === -1 ? -1 : autoSkills[autoSkillsIndex].programmingScore;
		const autoSkillsEligibility: ExcellenceAwardTeamEligibilityCriterion = {
			result:
				autoSkillsIndex === -1 ? 'no data' : autoSkillsNo <= overallSkillsThresholdNo && autoSkillsScore > 0 ? 'eligible' : 'ineligible',
			no: autoSkillsNo,
			score: autoSkillsScore
		};

		rtn.push({
			teamId,
			isEligible:
				qualRankingEligibility.result === 'eligible' &&
				overallSkillsEligibility.result === 'eligible' &&
				autoSkillsEligibility.result === 'eligible',
			qualRanking: qualRankingEligibility,
			overallSkills: overallSkillsEligibility,
			autoSkills: autoSkillsEligibility
		});
	}
	return rtn;
}
