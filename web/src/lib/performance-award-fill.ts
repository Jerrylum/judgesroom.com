import type { Grade } from '@judgesroom.com/protocol/src/award';

/** Finalist rank to the official performance award that place can fill. */
const FINALIST_AWARDS_BY_RANK: Readonly<Record<number, readonly string[]>> = {
	1: ['Teamwork Champion Award', 'Tournament Champions'],
	2: ['Teamwork 2nd Place Award', 'Tournament Finalists'],
	3: ['Teamwork 3rd Place Award', 'Tournament Semifinalists'],
	4: ['Teamwork 4rd Place Award', 'Tournament Quartnerfinalists'],
	5: ['Teamwork 5rd Place Award']
};

const SKILLS_AWARDS_BY_PLACE = ['Robot Skills Champion', 'Robot Skills 2nd Place', 'Robot Skills 3rd Place'] as const;

export interface PerformanceAwardSlot {
	name: string;
	winnersCount: number;
	acceptedGrades: readonly Grade[];
}

export interface FinalistRankingEntry {
	rank: number;
	teamNumber: string;
}

/** One team's combined skills score. Rows for the same team are added together. */
export interface SkillsScoreEntry {
	teamNumber: string;
	overallScore: number;
}

export interface RoomTeamGrade {
	number: string;
	grade: Grade;
}

export interface PerformanceAwardFill {
	awardName: string;
	teamNumbers: string[];
}

/** V5 elimination round, using the RobotEvents match `round` code. */
export type EliminationRound = 'quarterfinal' | 'semifinal' | 'final' | 'round_of_16';

/** One alliance in one elimination match. Team order is the order RobotEvents lists. */
export interface EliminationMatchAlliance {
	teamNumbers: string[];
	score: number;
}

/**
 * One V5 match. `round` is 3 quarterfinals, 4 semifinals, 5 finals, or 6 round of 16.
 * `instance` is the series, and `matchnum` is the game inside that series.
 */
export interface EliminationMatch {
	round: number;
	instance: number;
	matchnum: number;
	alliances: readonly EliminationMatchAlliance[];
}

export type PerformanceAwardFillProblem =
	| { kind: 'count'; awardName: string; teamNumbers: string[] }
	| { kind: 'missing_team'; awardName: string; teamNumbers: string[] }
	| { kind: 'skills_tie'; awardName: string; teamNumbers: string[] }
	| { kind: 'elimination_tie'; awardName: string; round: EliminationRound; instance: number; alliances: string[][] };

export type PerformanceAwardFillResult =
	| { status: 'ready'; fills: PerformanceAwardFill[] }
	| { status: 'empty' }
	| { status: 'refused'; problems: PerformanceAwardFillProblem[] };

/**
 * Choose IQ performance-award winners from a division finalist ranking and robot skills scores.
 * Nothing is partial: a count mismatch, a team missing from the room, or a skills tie refuses the whole fill.
 * V5 reuses this after its elimination matches have been turned into the same ranks.
 */
export function mapIQPerformanceAwardWinners(input: {
	awards: readonly PerformanceAwardSlot[];
	finalists: readonly FinalistRankingEntry[];
	skills: readonly SkillsScoreEntry[];
	roomTeams: readonly RoomTeamGrade[];
}): PerformanceAwardFillResult {
	const awardsByName = new Map(input.awards.map((award) => [award.name, award]));
	const roomByNumber = new Map(input.roomTeams.map((team) => [team.number, team]));
	const fills: PerformanceAwardFill[] = [];
	const problems: PerformanceAwardFillProblem[] = [];

	const finalistsByRank = new Map<number, string[]>();
	for (const finalist of input.finalists) {
		const teams = finalistsByRank.get(finalist.rank) ?? [];
		teams.push(finalist.teamNumber);
		finalistsByRank.set(finalist.rank, teams);
	}

	for (const [rank, awardNames] of Object.entries(FINALIST_AWARDS_BY_RANK)) {
		const award = awardNames.map((name) => awardsByName.get(name)).find((candidate) => candidate != null);
		if (!award) continue;
		const teamNumbers = finalistsByRank.get(Number(rank)) ?? [];
		if (teamNumbers.length !== award.winnersCount) {
			problems.push({ kind: 'count', awardName: award.name, teamNumbers });
			continue;
		}
		const missing = teamNumbers.filter((teamNumber) => !roomByNumber.has(teamNumber));
		if (missing.length > 0) {
			problems.push({ kind: 'missing_team', awardName: award.name, teamNumbers: missing });
			continue;
		}
		fills.push({ awardName: award.name, teamNumbers });
	}

	for (let place = 1; place <= SKILLS_AWARDS_BY_PLACE.length; place++) {
		const award = awardsByName.get(SKILLS_AWARDS_BY_PLACE[place - 1]);
		if (!award) continue;
		const acceptedGrades = new Set(award.acceptedGrades);
		const scores = new Map<string, number>();
		for (const skill of input.skills) {
			const team = roomByNumber.get(skill.teamNumber);
			if (!team || !acceptedGrades.has(team.grade)) continue;
			scores.set(skill.teamNumber, (scores.get(skill.teamNumber) ?? 0) + skill.overallScore);
		}
		const placed = competitionPlaces([...scores.entries()].map(([teamNumber, overall]) => ({ teamNumber, overall })));
		const occupying = placed.find((group) => place >= group.place && place < group.place + group.teamNumbers.length);
		if (!occupying) {
			problems.push({ kind: 'count', awardName: award.name, teamNumbers: [] });
			continue;
		}
		if (occupying.teamNumbers.length > 1) {
			problems.push({ kind: 'skills_tie', awardName: award.name, teamNumbers: occupying.teamNumbers });
			continue;
		}
		if (award.winnersCount !== 1) {
			problems.push({ kind: 'count', awardName: award.name, teamNumbers: occupying.teamNumbers });
			continue;
		}
		fills.push({ awardName: award.name, teamNumbers: occupying.teamNumbers });
	}

	if (problems.length > 0) return { status: 'refused', problems };
	if (fills.length === 0) return { status: 'empty' };
	return { status: 'ready', fills };
}

const QUARTERFINAL = 3;
const SEMIFINAL = 4;
const FINAL = 5;
const ROUND_OF_16 = 6;

/** Which finalist rank a V5 series fills. Round of 16 has no official performance award. */
const V5_RANK_FROM_SERIES: Readonly<Record<number, { winnerRank?: number; loserRank?: number }>> = {
	[FINAL]: { winnerRank: 1, loserRank: 2 },
	[SEMIFINAL]: { loserRank: 3 },
	[QUARTERFINAL]: { loserRank: 4 }
};

const ELIMINATION_ROUND_NAME: Readonly<Record<number, EliminationRound>> = {
	[QUARTERFINAL]: 'quarterfinal',
	[SEMIFINAL]: 'semifinal',
	[FINAL]: 'final',
	[ROUND_OF_16]: 'round_of_16'
};

/**
 * Fill V5 tournament awards from elimination matches, then skills awards the same way as IQ.
 * A series is best of however many games were played: the alliance with more wins advances.
 * Equal wins are a tie, and every configured award that series decides is refused.
 */
export function mapV5PerformanceAwardWinners(input: {
	awards: readonly PerformanceAwardSlot[];
	matches: readonly EliminationMatch[];
	skills: readonly SkillsScoreEntry[];
	roomTeams: readonly RoomTeamGrade[];
}): PerformanceAwardFillResult {
	const derived = finalistsFromV5Matches(input.matches);
	const tieProblems = eliminationTieProblems(input.awards, derived.ties);
	const blocked = new Set(tieProblems.map((problem) => problem.awardName));
	const result = mapIQPerformanceAwardWinners({
		awards: input.awards.filter((award) => !blocked.has(award.name)),
		finalists: derived.finalists,
		skills: input.skills,
		roomTeams: input.roomTeams
	});
	if (tieProblems.length === 0) return result;
	const otherProblems = result.status === 'refused' ? result.problems : [];
	return { status: 'refused', problems: [...tieProblems, ...otherProblems] };
}

interface SeriesTie {
	round: number;
	instance: number;
	alliances: string[][];
}

function finalistsFromV5Matches(matches: readonly EliminationMatch[]): { finalists: FinalistRankingEntry[]; ties: SeriesTie[] } {
	const gamesBySeries = new Map<string, EliminationMatch[]>();
	for (const match of matches) {
		if (ELIMINATION_ROUND_NAME[match.round] == null) continue;
		const key = `${match.round}:${match.instance}`;
		const games = gamesBySeries.get(key) ?? [];
		games.push(match);
		gamesBySeries.set(key, games);
	}

	const series = [...gamesBySeries.entries()]
		.map(([key, games]) => {
			const [round, instance] = key.split(':').map(Number);
			return resolveSeries(round, instance, games);
		})
		.filter((resolved) => resolved != null)
		.sort((a, b) => a.round - b.round || a.instance - b.instance);

	const ties: SeriesTie[] = [];
	for (const resolved of series) {
		if (resolved.status !== 'tie' || V5_RANK_FROM_SERIES[resolved.round] == null) continue;
		ties.push({ round: resolved.round, instance: resolved.instance, alliances: resolved.alliances });
	}
	const tiedRanks = new Set<number>();
	for (const tie of ties) {
		const spec = V5_RANK_FROM_SERIES[tie.round];
		if (spec?.winnerRank != null) tiedRanks.add(spec.winnerRank);
		if (spec?.loserRank != null) tiedRanks.add(spec.loserRank);
	}

	const finalists: FinalistRankingEntry[] = [];
	for (const resolved of series) {
		if (resolved.status !== 'winner') continue;
		const spec = V5_RANK_FROM_SERIES[resolved.round];
		if (!spec) continue;
		if (spec.winnerRank != null && !tiedRanks.has(spec.winnerRank)) {
			for (const teamNumber of resolved.winners) finalists.push({ rank: spec.winnerRank, teamNumber });
		}
		if (spec.loserRank != null && !tiedRanks.has(spec.loserRank)) {
			for (const teamNumber of resolved.losers) finalists.push({ rank: spec.loserRank, teamNumber });
		}
	}
	return { finalists, ties };
}

function eliminationTieProblems(awards: readonly PerformanceAwardSlot[], ties: readonly SeriesTie[]): PerformanceAwardFillProblem[] {
	const problems: PerformanceAwardFillProblem[] = [];
	for (const tie of ties) {
		const spec = V5_RANK_FROM_SERIES[tie.round];
		const round = ELIMINATION_ROUND_NAME[tie.round];
		if (!spec || !round) continue;
		for (const rank of [spec.winnerRank, spec.loserRank]) {
			if (rank == null) continue;
			const award = awardForRank(awards, rank);
			if (!award) continue;
			problems.push({ kind: 'elimination_tie', awardName: award.name, round, instance: tie.instance, alliances: tie.alliances });
		}
	}
	return problems;
}

function awardForRank(awards: readonly PerformanceAwardSlot[], rank: number): PerformanceAwardSlot | undefined {
	const names = FINALIST_AWARDS_BY_RANK[rank];
	if (!names) return undefined;
	return names.map((name) => awards.find((award) => award.name === name)).find((award) => award != null);
}

type ResolvedSeries =
	| { status: 'winner'; round: number; instance: number; winners: string[]; losers: string[] }
	| { status: 'tie'; round: number; instance: number; alliances: string[][] };

/** The alliance with more match wins takes the series. Equal wins, including a scoreless game, are a tie. */
function resolveSeries(round: number, instance: number, games: readonly EliminationMatch[]): ResolvedSeries | null {
	const sides = new Map<string, { teams: string[]; wins: number }>();
	for (const game of [...games].sort((a, b) => a.matchnum - b.matchnum)) {
		const playing = game.alliances
			.map((alliance) => ({
				teams: alliance.teamNumbers.map((teamNumber) => teamNumber.trim()).filter((teamNumber) => teamNumber.length > 0),
				score: alliance.score
			}))
			.filter((alliance) => alliance.teams.length > 0 && Number.isFinite(alliance.score));
		if (playing.length !== 2) continue;
		for (const alliance of playing) {
			const key = allianceKey(alliance.teams);
			if (!sides.has(key)) sides.set(key, { teams: alliance.teams, wins: 0 });
		}
		const [first, second] = playing;
		if (first.score === second.score) continue;
		const winner = first.score > second.score ? first : second;
		const side = sides.get(allianceKey(winner.teams));
		if (side) side.wins += 1;
	}
	if (sides.size !== 2) return null;
	const [first, second] = [...sides.values()];
	if (first.wins === second.wins) return { status: 'tie', round, instance, alliances: [first.teams, second.teams] };
	const winners = first.wins > second.wins ? first : second;
	const losers = winners === first ? second : first;
	return { status: 'winner', round, instance, winners: winners.teams, losers: losers.teams };
}

function allianceKey(teamNumbers: readonly string[]): string {
	return [...teamNumbers].sort().join('\0');
}

function competitionPlaces(teams: { teamNumber: string; overall: number }[]): { place: number; teamNumbers: string[] }[] {
	const sorted = [...teams].sort((a, b) => b.overall - a.overall || a.teamNumber.localeCompare(b.teamNumber));
	const groups: { overall: number; teamNumbers: string[] }[] = [];
	for (const team of sorted) {
		const current = groups.at(-1);
		if (current && current.overall === team.overall) {
			current.teamNumbers.push(team.teamNumber);
			continue;
		}
		groups.push({ overall: team.overall, teamNumbers: [team.teamNumber] });
	}
	let nextPlace = 1;
	return groups.map((group) => {
		const placed = { place: nextPlace, teamNumbers: group.teamNumbers };
		nextPlace += group.teamNumbers.length;
		return placed;
	});
}
