<script lang="ts">
	import { app, dialogs, tabs } from '$lib/app-page.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import { NotebookRubricTab } from '$lib/tab.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { NotebookDevelopmentStatus } from '@judging.jerryio/protocol/src/team';
	import EditTeamDataDialog from './EditTeamDataDialog.svelte';
	import QRCodeButton from './QRCodeButton.svelte';

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
	class="min-h-51 relative flex flex-col rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-lg"
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
			{#if team.absent}
				<span class="text-xs text-red-600" title="Absent">⚠</span>
			{/if}
		</div>
	</div>

	<!-- Notebook Link -->
	{#if team.notebookLink}
		<div class="relative mb-2 flex flex-row items-center justify-end gap-1">
			<a
				href={team.notebookLink}
				target="_blank"
				class="absolute left-0 w-[calc(100%-30px)] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-blue-600 underline hover:text-blue-800 active:text-blue-900"
				title={team.notebookLink}
			>
				{team.notebookLink.replace(/^https?:\/\//, '')}
			</a>
			<QRCodeButton link={team.notebookLink} />
		</div>
	{:else}
		<div class="mb-2 flex h-6 items-center">
			<span class="block text-xs text-gray-400">No notebook link</span>
		</div>
	{/if}

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
