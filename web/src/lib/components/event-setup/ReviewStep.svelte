<script lang="ts">
	import { separateAwardOptionsByType, type AwardOptions } from '$lib/award.svelte';
	import type { EditingJudgeGroup } from '$lib/judging.svelte';
	import { EditingTeam, groupTeamsByGroup } from '$lib/team.svelte';
	import type { Program } from '@judging.jerryio/protocol/src/award';
	import type { EventGradeLevel } from '@judging.jerryio/protocol/src/event';
	import type { JudgingMethod } from '@judging.jerryio/protocol/src/judging';

	interface Props {
		selectedProgram: Program;
		selectedEventGradeLevel: EventGradeLevel;
		teams: EditingTeam[];
		awardOptions: AwardOptions[];
		judgingMethod: JudgingMethod;
		judgeGroups: EditingJudgeGroup[];
		judges: { id: string; name: string; groupId: string }[];
		onPrev: () => void;
		onComplete: () => void;
		onCancel: () => void;
		isSessionJoined: boolean;
	}

	let {
		selectedProgram,
		selectedEventGradeLevel,
		teams,
		awardOptions,
		judgingMethod,
		judgeGroups,
		judges,
		onPrev,
		onComplete,
		onCancel,
		isSessionJoined
	}: Props = $props();

	const { performanceAwards, judgedAwards, volunteerNominatedAwards } = $derived(separateAwardOptionsByType(awardOptions));
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">Review & Confirm</h2>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		<div class="rounded-lg bg-gray-50 p-4">
			<h3 class="mb-2 font-medium text-gray-900">Competition Details</h3>
			<p class="text-sm text-gray-600">
				Type: <span class="font-medium">{selectedProgram}</span>
			</p>
			<p class="text-sm text-gray-600">
				Grade Level: <span class="font-medium">{selectedEventGradeLevel}</span>
			</p>
			<p class="text-sm text-gray-600">
				Teams: <span class="font-medium">{teams.filter((t) => !t.excluded).length}</span> active
			</p>
			<p class="text-sm text-gray-600">
				Team Groups: <span class="font-medium">{Object.keys(groupTeamsByGroup(teams)).length}</span>
			</p>
		</div>

		<div class="rounded-lg bg-gray-50 p-4">
			<h3 class="mb-2 font-medium text-gray-900">Selected Awards</h3>
			<p class="text-sm text-gray-600">
				Performance: <span class="font-medium">{performanceAwards.filter((a) => a.isSelected).length}</span>
				of {performanceAwards.length}
			</p>
			<p class="text-sm text-gray-600">
				Judged: <span class="font-medium">{judgedAwards.filter((a) => a.isSelected).length}</span>
				of {judgedAwards.length}
			</p>
			<p class="text-sm text-gray-600">
				Volunteer Nominated: <span class="font-medium">{volunteerNominatedAwards.filter((a) => a.isSelected).length}</span>
				of {volunteerNominatedAwards.length}
			</p>
		</div>

		<div class="rounded-lg bg-gray-50 p-4">
			<h3 class="mb-2 font-medium text-gray-900">Judging Setup</h3>
			<p class="text-sm text-gray-600">
				Method: <span class="font-medium">{judgingMethod === 'walk_in' ? 'Walk-in' : 'Pre-assigned'}</span>
			</p>
			<p class="text-sm text-gray-600">
				Judge Groups: <span class="font-medium">{judgeGroups.length}</span>
			</p>
			<p class="text-sm text-gray-600">
				Total Judges: <span class="font-medium">{judges.length}</span>
			</p>
			{#if judgingMethod === 'assigned'}
				<p class="text-sm text-gray-600">
					Assigned Teams: <span class="font-medium">{judgeGroups.reduce((sum, group) => sum + group.assignedTeams.length, 0)}</span>
				</p>
			{/if}
		</div>
	</div>

	<div class="flex justify-between pt-4">
		<div class="flex space-x-3">
			<button onclick={onPrev} class="secondary">Back</button>
			{#if isSessionJoined}
				<button onclick={onCancel} class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					Cancel
				</button>
			{/if}
		</div>
		<button onclick={onComplete} class="success">Complete Setup</button>
	</div>
</div>
