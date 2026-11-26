<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import './notebook-sorting.css';
	import { dialogs, tabs } from '#lib/index.svelte.ts';
	import EditIcon from '#lib/icon/EditIcon.svelte';
	import { NotebookRubricTab } from '#lib/tab.svelte.ts';
	import type { TeamInfoAndData } from '#lib/team.svelte.ts';
	import type { NotebookSubmissionMethod } from '@judgesroom.com/protocol/src/team';
	import { notebookDevelopmentStatusClass, notebookDevelopmentStatusLabel, notebookSortingControls } from '#lib/notebook-status.ts';
	import EditTeamDataDialog from './EditTeamDataDialog.svelte';
	import NotebookStatusRadios from './NotebookStatusRadios.svelte';
	import QRCodeButton from './QRCodeButton.svelte';
	import { scrollSync } from '#lib/scroll-sync.svelte.ts';

	interface SubmittedNotebook {
		rubricId: string;
		score: number | null;
	}

	interface Props {
		teams: TeamInfoAndData[];
		submittedNotebookByTeam: Record<string, SubmittedNotebook>;
		notebookSubmissionMethod: NotebookSubmissionMethod;
	}

	let { teams, submittedNotebookByTeam, notebookSubmissionMethod }: Props = $props();

	const isDigital = $derived(notebookSubmissionMethod === 'digital');

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	function submittedScoreText(score: number | null): string {
		return score === null ? '—' : String(score);
	}

	function openNotebookRubric(teamId: string, rubricId: string | null) {
		const tab = rubricId ? new NotebookRubricTab({ rubricId }) : new NotebookRubricTab({ teamId });
		tabs.addOrReuseTab(tab);
	}

	// Open team data edit dialog
	function openEditTeamDataDialog(team: TeamInfoAndData) {
		dialogs.showCustom(EditTeamDataDialog, { props: { team } });
	}
</script>

<div class="mb-2 flex flex-row justify-end gap-2 text-sm lg:hidden!">
	<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
</div>

<notebook-sorting-table>
	<table-header>
		<team>{m.team_number()}</team>
		<scroll-container use:registerScrollContainer class="bg-gray-200">
			<content>
				{#if isDigital}
					<div class="flex max-w-48 min-w-48 flex-col items-center justify-center">{m.notebook_link_table()}</div>
				{/if}
				<div class="flex max-w-56 min-w-56 items-center justify-center">{m.notebook_status_table()}</div>
				<div class="flex max-w-40 min-w-40 items-center justify-center">{m.notebook_development_table()}</div>
				<div class="flex min-w-50 items-center justify-center">{m.actions_table()}</div>
			</content>
		</scroll-container>
	</table-header>
	<table-body>
		{#each teams as team (team.id)}
			{@const devStatus = team.notebookDevelopmentStatus}
			{@const controls = notebookSortingControls(notebookSubmissionMethod, devStatus)}
			{@const submittedNotebook = submittedNotebookByTeam[team.id]}
			<row>
				<team>
					<div class="flex items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
						<span title={team.number}>{team.number}</span>
						{#if team.absent}
							<span class="text-xs font-bold text-red-600" title="Absent">ABS</span>
						{/if}
					</div>
				</team>
				<scroll-container use:registerScrollContainer>
					<content>
						{#if isDigital}
							<div class="flex max-w-48 min-w-48 items-center gap-2">
								{#if team.notebookLink}
									<a
										href={team.notebookLink}
										target="_blank"
										class="flex-1 overflow-hidden text-xs text-ellipsis whitespace-nowrap text-blue-600 underline hover:text-blue-800 active:text-blue-900"
										title={team.notebookLink}
									>
										{team.notebookLink.replace(/^https?:\/\//, '')}
									</a>
									<QRCodeButton link={team.notebookLink} />
								{:else}
									<span class="text-xs text-gray-400">{m.no_notebook_link()}</span>
								{/if}
							</div>
						{/if}

						<div class="flex max-w-56 min-w-56 items-center">
							<NotebookStatusRadios {team} options={controls.options} />
						</div>

						<div class="flex max-w-40 min-w-40 items-center justify-center">
							<span class={['text-sm font-medium', notebookDevelopmentStatusClass(devStatus)]}
								>{notebookDevelopmentStatusLabel(devStatus)}</span
							>
						</div>

						<div class="flex min-w-50 items-center justify-center gap-2">
							<div class="min-h-8">
								{#if controls.showStartRubric}
									<button
										onclick={() => openNotebookRubric(team.id, submittedNotebook?.rubricId ?? null)}
										class={['primary tiny text-nowrap', { 'bg-green-800!': submittedNotebook !== undefined }]}
									>
										{#if submittedNotebook}
											{m.you_submitted({ score: submittedScoreText(submittedNotebook.score) })}
										{:else}
											{m.start_rubric()}
										{/if}
									</button>
								{/if}
							</div>
							{#if isDigital}
								<button
									onclick={() => openEditTeamDataDialog(team)}
									class="text-gray-400 hover:text-gray-600 active:text-gray-800"
									title={m.edit_team_data({ teamNumber: team.number })}
								>
									<EditIcon size={16} />
								</button>
							{/if}
						</div>
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</notebook-sorting-table>
