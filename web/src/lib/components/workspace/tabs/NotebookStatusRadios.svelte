<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { app } from '#lib/index.svelte.ts';
	import { notebookDevelopmentStatusLabel } from '#lib/notebook-status.ts';
	import type { TeamInfoAndData } from '#lib/team.svelte.ts';
	import type { NotebookDevelopmentStatus } from '@judgesroom.com/protocol/src/team';
	import { errorToString } from '#lib/utils.svelte.ts';

	interface Props {
		team: TeamInfoAndData;
		options: NotebookDevelopmentStatus[];
	}

	let { team, options }: Props = $props();

	async function updateNotebookStatus(notebookDevelopmentStatus: NotebookDevelopmentStatus) {
		if (team.notebookDevelopmentStatus === notebookDevelopmentStatus) return;
		try {
			await app.wrpcClient.team.updateTeamData.mutation({
				...team,
				notebookDevelopmentStatus
			});
		} catch (error) {
			app.addErrorNotice(m.failed_to_update_notebook_status({ error: errorToString(error) }));
		}
	}
</script>

<div class="flex min-h-16 flex-col justify-start gap-2">
	{#each options as option (option)}
		<label class="flex items-center gap-2">
			<input
				type="radio"
				name={`notebook-status-${team.id}`}
				checked={team.notebookDevelopmentStatus === option}
				value={option}
				class="mt-0.5 mr-2 rounded border-gray-300 sm:mt-0"
				onchange={() => updateNotebookStatus(option)}
			/>
			<span class="text-sm text-gray-700">{notebookDevelopmentStatusLabel(option)}</span>
		</label>
	{/each}
</div>
