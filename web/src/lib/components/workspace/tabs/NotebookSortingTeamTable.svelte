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

	interface Props {
		teams: TeamInfoAndData[];
		submittedNotebookRubricsOfCurrentJudge: string[];
	}

	let { teams, submittedNotebookRubricsOfCurrentJudge }: Props = $props();

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	// Function to update notebook development status
	async function updateNotebookStatus(team: TeamInfoAndData, notebookDevelopmentStatus: NotebookDevelopmentStatus) {
		try {
			await app.wrpcClient.team.updateTeamData.mutation({
				...team,
				notebookDevelopmentStatus,
				hasInnovateAwardSubmissionForm: isSubmittedNotebook(notebookDevelopmentStatus) ? team.hasInnovateAwardSubmissionForm : false
			});
		} catch (error) {
			app.addErrorNotice(m.failed_to_update_notebook_status());
		}
	}

	async function updateInnovateAwardSubmissionForm(team: TeamInfoAndData, hasInnovateAwardSubmissionForm: boolean) {
		try {
			await app.wrpcClient.team.updateTeamData.mutation({ ...team, hasInnovateAwardSubmissionForm });
		} catch (error) {
			app.addErrorNotice(m.failed_to_update_innovate_award_submission_form());
		}
	}

	// Function to open notebook rubric for a team
	function openNotebookRubric(teamId: string) {
		tabs.addOrReuseTab(new NotebookRubricTab({ teamId }));
	}

	// Open team data edit dialog
	function openEditTeamDataDialog(team: TeamInfoAndData) {
		dialogs.showCustom(EditTeamDataDialog, { props: { team } });
	}
</script>

<div class="lg:hidden! mb-2 flex flex-row justify-end gap-2 text-sm">
	<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
</div>

<notebook-sorting-table>
	<table-header>
		<team>TEAM NUMBER</team>
		<scroll-container use:registerScrollContainer class="bg-gray-200">
			<content>
				<div class="flex min-w-60 max-w-60 flex-col items-center justify-center">{m.notebook_link_table()}</div>
				<div class="flex min-w-40 max-w-40 items-center justify-center">{m.notebook_status_table()}</div>
				<div class="flex min-w-40 max-w-40 items-center justify-center text-center">{m.innovate_award_submission_form_table()}</div>
				<div class="min-w-50 flex items-center justify-center">{m.actions_table()}</div>
			</content>
		</scroll-container>
	</table-header>
	<table-body>
		{#each teams as team (team.id)}
			{@const devStatus = team.notebookDevelopmentStatus}
			{@const isSubmittedNotebookStatus = isSubmittedNotebook(devStatus)}
			{@const isSubmitted = submittedNotebookRubricsOfCurrentJudge.includes(team.id)}
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
						<div class="flex min-w-60 max-w-60 items-center gap-2 p-2">
							{#if team.notebookLink}
								<a
									href={team.notebookLink}
									target="_blank"
									class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-blue-600 underline hover:text-blue-800 active:text-blue-900"
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
						<div class="flex min-w-40 max-w-40 items-center justify-center p-2">
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

						<!-- Innovate Award Submission Form Checkbox -->
						<div class="flex min-w-40 max-w-40 items-center justify-center p-2">
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									disabled={!isSubmittedNotebookStatus}
									checked={team.hasInnovateAwardSubmissionForm}
									class="rounded border-gray-300"
									onchange={() => updateInnovateAwardSubmissionForm(team, !team.hasInnovateAwardSubmissionForm)}
								/>
								<span class="text-sm text-gray-700" class:opacity-50={!isSubmittedNotebookStatus}>
									{team.hasInnovateAwardSubmissionForm ? m.provided() : m.not_provided()}
								</span>
							</label>
						</div>

						<!-- Actions Column -->
						<div class="min-w-50 flex items-center justify-center gap-2 p-2">
							{#if devStatus === 'fully_developed'}
								<button onclick={() => openNotebookRubric(team.id)} class="primary tiny" class:bg-green-800!={isSubmitted}>
									{#if isSubmitted}
										{m.you_submitted()}
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
