import { describe, expect, it } from 'vitest';
import {
	mapIQPerformanceAwardWinners,
	mapV5PerformanceAwardWinners,
	type EliminationMatch,
	type PerformanceAwardSlot,
	type RoomTeamGrade
} from './performance-award-fill.ts';

const middleSchool = ['Elementary School', 'Middle School'] as const;

const teamworkChampion: PerformanceAwardSlot = {
	name: 'Teamwork Champion Award',
	winnersCount: 2,
	acceptedGrades: middleSchool
};

const skillsChampion: PerformanceAwardSlot = {
	name: 'Robot Skills Champion',
	winnersCount: 1,
	acceptedGrades: middleSchool
};

const skillsSecond: PerformanceAwardSlot = {
	name: 'Robot Skills 2nd Place',
	winnersCount: 1,
	acceptedGrades: middleSchool
};

function room(...numbers: string[]): RoomTeamGrade[] {
	return numbers.map((number) => ({ number, grade: 'Middle School' }));
}

describe('mapIQPerformanceAwardWinners', () => {
	it('fills a two-team Teamwork Champion from finalist rank 1', () => {
		const result = mapIQPerformanceAwardWinners({
			awards: [teamworkChampion],
			finalists: [
				{ rank: 1, teamNumber: '2700E' },
				{ rank: 1, teamNumber: '21000B' },
				{ rank: 2, teamNumber: '6600A' },
				{ rank: 2, teamNumber: '4800A' }
			],
			skills: [],
			roomTeams: room('2700E', '21000B', '6600A', '4800A')
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [{ awardName: 'Teamwork Champion Award', teamNumbers: ['2700E', '21000B'] }]
		});
	});

	it('refuses the whole fill when a champion rank has three teams', () => {
		const result = mapIQPerformanceAwardWinners({
			awards: [teamworkChampion],
			finalists: [
				{ rank: 1, teamNumber: '2700E' },
				{ rank: 1, teamNumber: '21000B' },
				{ rank: 1, teamNumber: '2700C' }
			],
			skills: [],
			roomTeams: room('2700E', '21000B', '2700C')
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [{ kind: 'count', awardName: 'Teamwork Champion Award', teamNumbers: ['2700E', '21000B', '2700C'] }]
		});
	});

	it('refuses when a finalist team is not in the room', () => {
		const result = mapIQPerformanceAwardWinners({
			awards: [teamworkChampion],
			finalists: [
				{ rank: 1, teamNumber: '2700E' },
				{ rank: 1, teamNumber: '9999Z' }
			],
			skills: [],
			roomTeams: room('2700E', '21000B')
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [{ kind: 'missing_team', awardName: 'Teamwork Champion Award', teamNumbers: ['9999Z'] }]
		});
	});

	it('refuses a skills place that is tied', () => {
		const result = mapIQPerformanceAwardWinners({
			awards: [skillsChampion, skillsSecond],
			finalists: [],
			skills: [
				{ teamNumber: '4800B', overallScore: 200 },
				{ teamNumber: '6600A', overallScore: 200 },
				{ teamNumber: '2700E', overallScore: 105 }
			],
			roomTeams: room('4800B', '6600A', '2700E')
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{ kind: 'skills_tie', awardName: 'Robot Skills Champion', teamNumbers: ['4800B', '6600A'] },
				{ kind: 'skills_tie', awardName: 'Robot Skills 2nd Place', teamNumbers: ['4800B', '6600A'] }
			]
		});
	});

	it('fills the skills champion from the highest combined score and skips an unconfigured place', () => {
		const result = mapIQPerformanceAwardWinners({
			awards: [skillsChampion],
			finalists: [],
			skills: [
				{ teamNumber: '6600A', overallScore: 113 },
				{ teamNumber: '4800B', overallScore: 200 }
			],
			roomTeams: room('4800B', '6600A', '2700A')
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [{ awardName: 'Robot Skills Champion', teamNumbers: ['4800B'] }]
		});
	});

	it('refuses teamwork awards when the finals have not been played', () => {
		const teamworkSecond: PerformanceAwardSlot = {
			name: 'Teamwork 2nd Place Award',
			winnersCount: 2,
			acceptedGrades: middleSchool
		};
		const result = mapIQPerformanceAwardWinners({
			awards: [teamworkChampion, teamworkSecond, skillsChampion],
			finalists: [],
			skills: [{ teamNumber: '4800B', overallScore: 200 }],
			roomTeams: room('4800B', '2700E', '21000B')
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{ kind: 'count', awardName: 'Teamwork Champion Award', teamNumbers: [] },
				{ kind: 'count', awardName: 'Teamwork 2nd Place Award', teamNumbers: [] }
			]
		});
	});
});

const champions: PerformanceAwardSlot = { name: 'Tournament Champions', winnersCount: 2, acceptedGrades: ['High School'] };
const finalists: PerformanceAwardSlot = { name: 'Tournament Finalists', winnersCount: 2, acceptedGrades: ['High School'] };
const semifinalists: PerformanceAwardSlot = { name: 'Tournament Semifinalists', winnersCount: 4, acceptedGrades: ['High School'] };
const quarterfinalists: PerformanceAwardSlot = { name: 'Tournament Quartnerfinalists', winnersCount: 8, acceptedGrades: ['High School'] };

function v5Room(...numbers: string[]): RoomTeamGrade[] {
	return numbers.map((number) => ({ number, grade: 'High School' }));
}

/** Alliances are listed blue then red, matching the RobotEvents match payload. */
function game(round: number, instance: number, matchnum: number, blue: [string[], number], red: [string[], number]): EliminationMatch {
	return {
		round,
		instance,
		matchnum,
		alliances: [
			{ teamNumbers: blue[0], score: blue[1] },
			{ teamNumbers: red[0], score: red[1] }
		]
	};
}

describe('mapV5PerformanceAwardWinners', () => {
	const allianceA = ['19176Y', '71030Z'];
	const allianceB = ['52222X', '96969Y'];
	const allianceC = ['17022A', '60206Y'];
	const allianceD = ['8706S', '32028M'];

	it('gives the series to the alliance that wins more games, including a color swap', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, finalists],
			matches: [
				game(2, 1, 1, [allianceA, 200], [allianceB, 0]),
				game(5, 1, 1, [allianceA, 57], [allianceB, 93]),
				game(5, 1, 2, [allianceB, 68], [allianceA, 143]),
				game(5, 1, 3, [allianceA, 103], [allianceB, 70])
			],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB)
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [
				{ awardName: 'Tournament Champions', teamNumbers: allianceA },
				{ awardName: 'Tournament Finalists', teamNumbers: allianceB }
			]
		});
	});

	it('stops a best-of series once the wins are unequal, without waiting for an unplayed game', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions],
			matches: [game(5, 1, 1, [allianceA, 10], [allianceB, 20]), game(5, 1, 2, [allianceA, 5], [allianceB, 30])],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB)
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [{ awardName: 'Tournament Champions', teamNumbers: allianceB }]
		});
	});

	it('fills semifinalists and quarterfinalists from the losing alliances', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, finalists, semifinalists, quarterfinalists],
			matches: [
				game(3, 1, 1, [allianceA, 20], [['q1', 'q2'], 10]),
				game(3, 2, 1, [['q3', 'q4'], 5], [allianceB, 9]),
				game(3, 3, 1, [allianceC, 8], [['q5', 'q6'], 1]),
				game(3, 4, 1, [['q7', 'q8'], 3], [allianceD, 4]),
				game(4, 1, 1, [allianceA, 1], [allianceB, 2]),
				game(4, 2, 1, [allianceC, 4], [allianceD, 3]),
				game(5, 1, 1, [allianceB, 7], [allianceC, 6])
			],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB, ...allianceC, ...allianceD, 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8')
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [
				{ awardName: 'Tournament Champions', teamNumbers: allianceB },
				{ awardName: 'Tournament Finalists', teamNumbers: allianceC },
				{ awardName: 'Tournament Semifinalists', teamNumbers: [...allianceA, ...allianceD] },
				{ awardName: 'Tournament Quartnerfinalists', teamNumbers: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] }
			]
		});
	});

	it('refuses champions and finalists when the final series is tied', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, finalists],
			matches: [game(5, 1, 1, [allianceA, 10], [allianceB, 20]), game(5, 1, 2, [allianceA, 30], [allianceB, 5])],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB)
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{ kind: 'elimination_tie', awardName: 'Tournament Champions', round: 'final', instance: 1, alliances: [allianceA, allianceB] },
				{ kind: 'elimination_tie', awardName: 'Tournament Finalists', round: 'final', instance: 1, alliances: [allianceA, allianceB] }
			]
		});
	});

	it('does not let an unselected quarterfinal tie block the final', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions],
			matches: [game(3, 1, 1, [allianceC, 10], [allianceD, 10]), game(5, 1, 1, [allianceA, 4], [allianceB, 9])],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB, ...allianceC, ...allianceD)
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [{ awardName: 'Tournament Champions', teamNumbers: allianceB }]
		});
	});

	it('refuses the whole fill when a selected semifinal series is tied', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, semifinalists],
			matches: [
				game(4, 1, 1, [allianceA, 10], [allianceB, 10]),
				game(4, 2, 1, [allianceC, 3], [allianceD, 8]),
				game(5, 1, 1, [allianceC, 2], [allianceD, 6])
			],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB, ...allianceC, ...allianceD)
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{
					kind: 'elimination_tie',
					awardName: 'Tournament Semifinalists',
					round: 'semifinal',
					instance: 1,
					alliances: [allianceA, allianceB]
				}
			]
		});
	});

	it('ignores a tied round of 16 because that round has no performance award', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions],
			matches: [game(6, 1, 1, [allianceC, 0], [allianceD, 0]), game(5, 1, 1, [allianceA, 1], [allianceB, 2])],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB)
		});

		expect(result).toEqual({
			status: 'ready',
			fills: [{ awardName: 'Tournament Champions', teamNumbers: allianceB }]
		});
	});

	it('refuses tournament awards when elimination matches have not been played', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, finalists, semifinalists],
			matches: [game(2, 1, 1, [allianceA, 40], [allianceB, 10])],
			skills: [{ teamNumber: '19176Y', overallScore: 80 }],
			roomTeams: v5Room(...allianceA, ...allianceB)
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{ kind: 'count', awardName: 'Tournament Champions', teamNumbers: [] },
				{ kind: 'count', awardName: 'Tournament Finalists', teamNumbers: [] },
				{ kind: 'count', awardName: 'Tournament Semifinalists', teamNumbers: [] }
			]
		});
	});

	it('refuses champions when earlier rounds are played and the final is missing', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, finalists, semifinalists],
			matches: [game(4, 1, 1, [allianceA, 10], [allianceB, 20]), game(4, 2, 1, [allianceC, 8], [allianceD, 3])],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB, ...allianceC, ...allianceD)
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{ kind: 'count', awardName: 'Tournament Champions', teamNumbers: [] },
				{ kind: 'count', awardName: 'Tournament Finalists', teamNumbers: [] }
			]
		});
	});

	it('refuses a scoreless final that has not been played', () => {
		const result = mapV5PerformanceAwardWinners({
			awards: [champions, finalists],
			matches: [game(5, 1, 1, [allianceA, 0], [allianceB, 0])],
			skills: [],
			roomTeams: v5Room(...allianceA, ...allianceB)
		});

		expect(result).toEqual({
			status: 'refused',
			problems: [
				{ kind: 'elimination_tie', awardName: 'Tournament Champions', round: 'final', instance: 1, alliances: [allianceA, allianceB] },
				{ kind: 'elimination_tie', awardName: 'Tournament Finalists', round: 'final', instance: 1, alliances: [allianceA, allianceB] }
			]
		});
	});
});
