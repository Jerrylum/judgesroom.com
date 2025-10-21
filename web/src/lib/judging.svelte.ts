import { v4 as uuidv4 } from 'uuid';
import { type TeamInfoAndData } from './team.svelte';
import { type Judge } from '@judgesroom.com/protocol/src/judging';

export class EditingJudgeGroup {
	public readonly id: string;
	public name: string = $state('');
	public assignedTeams: TeamInfoAndData[] = $state([]);

	constructor(name: string) {
		this.id = uuidv4();
		this.name = name;
	}

	assignTeam(team: TeamInfoAndData) {
		if (!this.assignedTeams.find((t) => t.id === team.id)) {
			this.assignedTeams.push(team);
		}
	}

	unassignTeam(teamId: string) {
		const index = this.assignedTeams.findIndex((t) => t.id === teamId);
		if (index > -1) {
			this.assignedTeams.splice(index, 1);
		}
	}
}

export function createJudge(id: string, name: string, groupId: string): Judge {
	return { id, name, groupId };
}

export function createJudgeFromString(name: string, groupId: string): Judge {
	return createJudge(uuidv4(), name.trim().slice(0, 100), groupId);
}

export function parseJudgeNamesFromInput(input: string): string[] {
	return input
		.split(/[,\n]/)
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

export function randomlyAssignTeamsToGroups(teams: TeamInfoAndData[], judgeGroups: EditingJudgeGroup[]): void {
	if (judgeGroups.length === 0) return;

	// Clear existing assignments
	judgeGroups.forEach((group) => {
		group.assignedTeams = [];
	});

	// Shuffle teams
	const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

	// Distribute teams evenly across groups
	shuffledTeams.forEach((team, index) => {
		const groupIndex = index % judgeGroups.length;
		judgeGroups[groupIndex].assignTeam(team);
	});
}

export function getJudgesInGroup(judges: Judge[], groupId: string): Judge[] {
	return judges.filter((judge) => judge.groupId === groupId);
}
