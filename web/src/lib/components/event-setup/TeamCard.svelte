<script lang="ts">
	import type { Team } from '$lib/teams.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import CheckIcon from '$lib/icon/CheckIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';

	interface Props {
		team: Team;
		onEdit: (team: Team) => void;
		showGrade?: boolean;
	}

	let { team = $bindable(), onEdit, showGrade = true }: Props = $props();

	function toggleExcluded() {
		team.excluded = !team.excluded;
	}
</script>

<div
	class="team-info min-h-19 cursor-move rounded bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
	class:opacity-50={team.excluded}
>
	<div class="flex items-start justify-between">
		<div class="flex-1">
			<div class="text-sm font-medium">{team.number}</div>
			<div class="truncate text-xs text-gray-600">{team.name}</div>
			{#if showGrade}
				<div class="text-xs text-gray-500">{team.grade}</div>
			{/if}
			{#if team.notebookLink}
				<div class="mt-1 text-xs text-blue-600">📓 Notebook</div>
			{/if}
		</div>
		<div class="ml-2 flex flex-col gap-1">
			<button
				onclick={() => onEdit(team)}
				class="text-xs text-blue-600 hover:text-blue-800"
				title="Edit team"
				aria-label={`Edit team ${team.number}`}
			>
				<EditIcon size={20} />
			</button>
			<button
				onclick={toggleExcluded}
				class="text-xs"
				class:text-red-600={team.excluded}
				class:text-gray-600={!team.excluded}
				title={team.excluded ? 'Include team' : 'Exclude team'}
			>
				{#if team.excluded}
					<CloseIcon size={20} />
				{:else}
					<CheckIcon size={20} />
				{/if}
			</button>
		</div>
	</div>
</div>
