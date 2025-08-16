<script lang="ts">
	import type { Team } from '$lib/teams.svelte';

	interface Props {
		team: Team;
		showGrade?: boolean;
		isSelected?: boolean;
	}

	let { team, showGrade = true, isSelected = false }: Props = $props();
</script>

<div
	class="team-info min-h-19 cursor-move rounded bg-white p-3 shadow-sm transition-all hover:shadow-md"
	class:ring-2={isSelected}
	class:ring-blue-500={isSelected}
	class:bg-blue-50={isSelected}
>
	<div class="flex items-start">
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
	</div>
</div>
