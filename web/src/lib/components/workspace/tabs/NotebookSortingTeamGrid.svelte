<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { dialogs, tabs } from '#lib/index.svelte.ts';
	import EditIcon from '#lib/icon/EditIcon.svelte';
	import { NotebookRubricTab } from '#lib/tab.svelte.ts';
	import type { TeamInfoAndData } from '#lib/team.svelte.ts';
	import type { NotebookSubmissionMethod } from '@judgesroom.com/protocol/src/team';
	import { notebookDevelopmentStatusClass, notebookDevelopmentStatusLabel, notebookSortingControls } from '#lib/notebook-status.ts';
	import EditTeamDataDialog from './EditTeamDataDialog.svelte';
	import NotebookStatusRadios from './NotebookStatusRadios.svelte';
	import QRCodeButton from './QRCodeButton.svelte';

	interface Props {
		team: TeamInfoAndData;
		submittedNotebook: { rubricId: string; score: number | null } | null;
		notebookSubmissionMethod: NotebookSubmissionMethod;
	}

	let { team, submittedNotebook, notebookSubmissionMethod }: Props = $props();

	const devStatus = $derived(team.notebookDevelopmentStatus);
	const isDigital = $derived(notebookSubmissionMethod === 'digital');
	const controls = $derived(notebookSortingControls(notebookSubmissionMethod, devStatus));

	function openNotebookRubric() {
		const tab = submittedNotebook
			? new NotebookRubricTab({ rubricId: submittedNotebook.rubricId })
			: new NotebookRubricTab({ teamId: team.id });
		tabs.addOrReuseTab(tab);
	}

	// Open team data edit dialog
	function openEditTeamDataDialog(team: any) {
		dialogs.showCustom(EditTeamDataDialog, { props: { team } });
	}
</script>

<div
	class={[
		'relative flex min-h-53 flex-col rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-lg',
		{
			'border-green-500': devStatus === 'fully_developed',
			'border-yellow-500': devStatus === 'developing',
			'border-gray-500': devStatus === 'not_submitted',
			'border-blue-500': devStatus === 'turned_in',
			'border-red-500': devStatus === 'notebook_link_broken'
		}
	]}
>
	<!-- Team Info Header -->
	<div class={['mb-2 flex items-center justify-between', { 'pr-28': devStatus === 'developing' || devStatus === 'fully_developed' }]}>
		<div class="flex items-center gap-2">
			<span class="font-medium text-gray-900">{team.number}</span>
			{#if isDigital}
				<button
					onclick={() => openEditTeamDataDialog(team)}
					class="text-gray-400 hover:text-gray-600 active:text-gray-800"
					title={m.edit_team_data({ teamNumber: team.number })}
				>
					<EditIcon size={16} />
				</button>
			{/if}
			{#if team.absent}
				<span class="text-xs font-bold text-red-600" title="Absent">ABS</span>
			{/if}
		</div>
	</div>

	<!-- Notebook Link -->
	{#if isDigital}
		{#if team.notebookLink}
			<div class="relative mb-2 flex h-6 flex-row items-center justify-end gap-1">
				<a
					href={team.notebookLink}
					target="_blank"
					class="absolute left-0 w-[calc(100%-30px)] overflow-hidden text-xs text-ellipsis whitespace-nowrap text-blue-600 underline hover:text-blue-800 active:text-blue-900"
					title={team.notebookLink}
				>
					{team.notebookLink.replace(/^https?:\/\//, '')}
				</a>
				<QRCodeButton link={team.notebookLink} />
			</div>
		{:else}
			<div class="mb-2 flex h-6 items-center">
				<span class="block text-xs text-gray-400">{m.no_notebook_link()}</span>
			</div>
		{/if}
	{/if}

	<NotebookStatusRadios {team} options={controls.options} />

	<div class="mt-2 min-h-8">
		{#if controls.showStartRubric}
			<button onclick={openNotebookRubric} class={['primary tiny w-full', { 'bg-green-800!': submittedNotebook !== null }]}>
				{#if submittedNotebook}
					{m.you_submitted({ score: submittedNotebook.score === null ? '—' : String(submittedNotebook.score) })}
				{:else}
					{m.start_rubric()}
				{/if}
			</button>
		{/if}
	</div>

	<!-- Status Indicator -->
	{#if devStatus === 'developing' || devStatus === 'fully_developed'}
		<div class="absolute top-2 right-2 flex items-center gap-1">
			<span class={['text-xs font-medium', notebookDevelopmentStatusClass(devStatus)]}>{notebookDevelopmentStatusLabel(devStatus)}</span>
			<div class={['h-2 w-2 rounded-full', devStatus === 'fully_developed' ? 'bg-green-500' : 'bg-yellow-500']}></div>
		</div>
	{:else if devStatus !== 'undetermined'}
		<div class="absolute top-2 right-2">
			{#if devStatus === 'notebook_link_broken'}
				<div class="h-2 w-2 rounded-full bg-red-500" title={notebookDevelopmentStatusLabel(devStatus)}></div>
			{:else if devStatus === 'turned_in'}
				<div class="h-2 w-2 rounded-full bg-blue-500" title={notebookDevelopmentStatusLabel(devStatus)}></div>
			{:else}
				<div class="h-2 w-2 rounded-full bg-gray-400" title={m.not_submitted_notebook_status()}></div>
			{/if}
		</div>
	{/if}
</div>
