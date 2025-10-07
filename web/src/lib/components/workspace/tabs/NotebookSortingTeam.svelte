<script lang="ts">
	import { app, dialogs, tabs } from '$lib/app-page.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import { NotebookRubricTab } from '$lib/tab.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { NotebookDevelopmentStatus } from '@judging.jerryio/protocol/src/team';
	import EditTeamDataDialog from './EditTeamDataDialog.svelte';

	interface Props {
		team: TeamInfoAndData;
		isSubmitted: boolean;
	}

	let { team, isSubmitted }: Props = $props();

	const devStatus = $derived(team.notebookDevelopmentStatus);

	// Function to update notebook development status
	async function updateNotebookStatus(notebookDevelopmentStatus: NotebookDevelopmentStatus) {
		try {
			await app.wrpcClient.team.updateTeamData.mutation({ ...team, notebookDevelopmentStatus });
		} catch (error) {
			app.addErrorNotice('Failed to update notebook status');
		}
	}

	// Function to truncate long text
	function truncateText(text: string, maxLength: number = 40): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	// Function to open notebook rubric for a team
	function openNotebookRubric() {
		tabs.addOrReuseTab(new NotebookRubricTab({ teamId: team.id }));
	}

	// Open team data edit dialog
	function openEditTeamDataDialog(team: any) {
		dialogs.showCustom(EditTeamDataDialog, { props: { team } });
	}
</script>

<div
	class="relative flex flex-col rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm"
	class:border-green-500={devStatus === 'fully_developed'}
	class:border-yellow-500={devStatus === 'developing'}
	class:border-gray-500={devStatus === 'not_submitted'}
>
	<!-- Team Info Header -->
	<div class="mb-2 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="font-medium text-gray-900">{team.number}</span>
			<button
				onclick={() => openEditTeamDataDialog(team)}
				class="text-gray-400 hover:text-gray-600 active:text-gray-800"
				title="Edit team data"
			>
				<EditIcon size={16} />
			</button>
			{#if team.excluded}
				<span class="text-xs text-red-600" title="Excluded from judged awards">⚠</span>
			{/if}
		</div>
	</div>

	<!-- Notebook Link -->
	<div class="mb-2">
		{#if team.notebookLink}
			<a
				href={team.notebookLink}
				target="_blank"
				class="block text-xs text-blue-600 underline hover:text-blue-800 active:text-blue-900"
				title={team.notebookLink}
			>
				{truncateText(team.notebookLink.replace(/^https?:\/\//, ''), 30)}
			</a>
		{:else}
			<span class="block text-xs text-gray-400">No notebook link</span>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label class="flex items-center gap-2">
			<input
				type="radio"
				checked={devStatus === 'fully_developed'}
				value="fully_developed"
				class="mr-2 mt-0.5 rounded border-gray-300 sm:mt-0"
				onchange={() => updateNotebookStatus('fully_developed')}
			/>
			<span class="text-sm text-gray-700">Fully Developed</span>
		</label>
		<label class="flex items-center gap-2">
			<input
				type="radio"
				checked={devStatus === 'developing'}
				value="developing"
				class="mr-2 mt-0.5 rounded border-gray-300 sm:mt-0"
				onchange={() => updateNotebookStatus('developing')}
			/>
			<span class="text-sm text-gray-700">Developing</span>
		</label>
		<label class="flex items-center gap-2">
			<input
				type="radio"
				checked={devStatus === 'not_submitted'}
				value="not_submitted"
				class="mr-2 mt-0.5 rounded border-gray-300 sm:mt-0"
				onchange={() => updateNotebookStatus('not_submitted')}
			/>
			<span class="text-sm text-gray-700">Not Submitted</span>
		</label>
	</div>

	{#if devStatus === 'fully_developed'}
		<button onclick={() => openNotebookRubric()} class="primary tiny mt-2 w-full">
			{#if isSubmitted}
				(You Submitted)
			{:else}
				Start Rubric
			{/if}
		</button>
	{/if}

	<!-- Status Indicator -->
	{#if devStatus !== 'undetermined'}
		<div class="absolute right-2 top-2">
			{#if devStatus === 'fully_developed'}
				<div class="h-2 w-2 rounded-full bg-green-500" title="Fully Developed"></div>
			{:else if devStatus === 'developing'}
				<div class="h-2 w-2 rounded-full bg-yellow-500" title="Developing"></div>
			{:else}
				<div class="h-2 w-2 rounded-full bg-gray-400" title="Not Reviewed"></div>
			{/if}
		</div>
	{/if}
</div>
