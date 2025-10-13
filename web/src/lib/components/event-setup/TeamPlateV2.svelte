<script lang="ts">
	import type { TeamInfoAndData } from '$lib/team.svelte';

	interface Props {
		team: TeamInfoAndData;
		showGrade?: boolean;
	}

	let { team, showGrade = true }: Props = $props();
</script>

<div class="team-info min-h-19 0 cursor-move rounded bg-white p-3 shadow-sm transition-all hover:shadow-md">
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
