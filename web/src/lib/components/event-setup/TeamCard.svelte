<script lang="ts">
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import CheckIcon from '$lib/icon/CheckIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import type { EditingTeam } from '$lib/team.svelte';

	interface Props {
		team: EditingTeam;
		onEdit: (team: EditingTeam) => void;
		showGrade?: boolean;
	}

	let { team = $bindable(), onEdit, showGrade = true }: Props = $props();

	function toggleAbsent() {
		team.absent = !team.absent;
	}
</script>

<div
	class="team-info min-h-19 cursor-move rounded bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
	class:opacity-50={team.absent}
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
				onclick={toggleAbsent}
				class="text-xs"
				class:text-red-600={team.absent}
				class:text-gray-600={!team.absent}
				title={team.absent ? 'Include team' : 'Exclude team'}
			>
				{#if team.absent}
					<CloseIcon size={20} />
				{:else}
					<CheckIcon size={20} />
				{/if}
			</button>
		</div>
	</div>
</div>
