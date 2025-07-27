import { z } from 'zod/v4';
import { v4 as uuidv4 } from 'uuid';
import { TeamNumberSchema, type Team } from './teams.svelte';

export const JudgingMethodSchema = z.enum(['walk_in', 'assigned']);
export type JudgingMethod = z.infer<typeof JudgingMethodSchema>;

export const JudgeNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, { message: 'Judge name must not have leading or trailing whitespace' });

export const JudgeGroupNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, {
		message: 'Judge group name must not have leading or trailing whitespace'
	});

export const JudgeSchema = z.object({
	id: z.uuidv4(),
	name: JudgeNameSchema,
	groupId: z.uuidv4()
});

export type Judge = z.infer<typeof JudgeSchema>;

export const JudgeGroupSchema = z.object({
	id: z.uuidv4(),
	name: JudgeGroupNameSchema,
	assignedTeams: z.array(TeamNumberSchema)
});
export type JudgeGroup = z.infer<typeof JudgeGroupSchema>;

export class JudgeGroupClass {
	public readonly id: string;
	public name: string = $state('');
	public assignedTeams: Team[] = $state([]);

	constructor(name: string) {
		this.id = uuidv4();
		this.name = name;
	}

	assignTeam(team: Team) {
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
	return {
		id,
		name,
		groupId
	};
}

export function createJudgeFromString(name: string, groupId: string): Judge {
	return createJudge(uuidv4(), name.trim(), groupId);
}

export function parseJudgeNamesFromInput(input: string): string[] {
	return input
		.split(/[,\n]/)
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

export function randomlyAssignTeamsToGroups(teams: Team[], judgeGroups: JudgeGroupClass[]): void {
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
