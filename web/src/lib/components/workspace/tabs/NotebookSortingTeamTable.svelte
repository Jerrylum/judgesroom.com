<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import './notebook-sorting.css';
	import { app, dialogs, tabs } from '$lib/index.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import { NotebookRubricTab } from '$lib/tab.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import { isSubmittedNotebook, type NotebookDevelopmentStatus } from '@judgesroom.com/protocol/src/team';
	import EditTeamDataDialog from './EditTeamDataDialog.svelte';
	import QRCodeButton from './QRCodeButton.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';

	interface SubmittedNotebook {
		rubricId: string;
		score: number | null;
	}

	interface Props {
		teams: TeamInfoAndData[];
		submittedNotebookByTeam: Record<string, SubmittedNotebook>;
	}

	let { teams, submittedNotebookByTeam }: Props = $props();

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	// Function to update notebook development status
	async function updateNotebookStatus(team: TeamInfoAndData, notebookDevelopmentStatus: NotebookDevelopmentStatus) {
		try {
			await app.wrpcClient.team.updateTeamData.mutation({
				...team,
				notebookDevelopmentStatus
			});
		} catch (error) {
			app.addErrorNotice(m.failed_to_update_notebook_status());
		}
	}

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
				<div class="flex max-w-90 min-w-90 flex-col items-center justify-center">{m.notebook_link_table()}</div>
				<div class="flex max-w-40 min-w-40 items-center justify-center">{m.notebook_status_table()}</div>
				<div class="flex min-w-50 items-center justify-center">{m.actions_table()}</div>
			</content>
		</scroll-container>
	</table-header>
	<table-body>
		{#each teams as team (team.id)}
			{@const devStatus = team.notebookDevelopmentStatus}
			{@const isSubmittedNotebookStatus = isSubmittedNotebook(devStatus)}
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
						<!-- Notebook Link Column -->
						<div class="flex max-w-90 min-w-90 items-center gap-2 p-2">
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

						<!-- Development Status Dropdown -->
						<div class="flex max-w-40 min-w-40 items-center justify-center p-2">
							<select
								value={devStatus}
								onchange={(e) => updateNotebookStatus(team, e.currentTarget.value as NotebookDevelopmentStatus)}
								class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
								class:border-green-500={devStatus === 'fully_developed'}
								class:border-yellow-500={devStatus === 'developing'}
								class:border-gray-500={devStatus === 'not_submitted'}
							>
								<option value="undetermined">{m.undetermined_notebook_status()}</option>
								<option value="fully_developed">{m.fully_developed_notebook_status()}</option>
								<option value="developing">{m.developing_notebook_status()}</option>
								<option value="not_submitted">{m.not_submitted_notebook_status()}</option>
							</select>
						</div>

						<!-- Actions Column -->
						<div class="flex min-w-50 items-center justify-center gap-2 p-2">
							{#if isSubmittedNotebookStatus}
								<button
									onclick={() => openNotebookRubric(team.id, submittedNotebook?.rubricId ?? null)}
									class="primary tiny text-nowrap"
									class:bg-green-800!={submittedNotebook !== undefined}
								>
									{#if submittedNotebook}
										{m.you_submitted({ score: submittedScoreText(submittedNotebook.score) })}
									{:else}
										{m.start_rubric()}
									{/if}
								</button>
							{/if}
							<button
								onclick={() => openEditTeamDataDialog(team)}
								class="text-gray-400 hover:text-gray-600 active:text-gray-800"
								title="Edit team data"
							>
								<EditIcon size={16} />
							</button>
						</div>
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</notebook-sorting-table>
