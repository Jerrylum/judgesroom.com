<script lang="ts">
	import { app, dialogs, tabs } from '$lib/app-page.svelte';
	import type { NotebookSortingTab } from '$lib/tab.svelte';
	import { NotebookRubricTab } from '$lib/tab.svelte';
	import { sortByAssignedTeams, sortByTeamNumber } from '$lib/team.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import EditTeamDataDialog from './EditTeamDataDialog.svelte';

	interface Props {
		tab: NotebookSortingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());

	// Check if the event uses assigned judging method
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');

	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());

	// State for showing only assigned teams
	let showOnlyAssignedTeams = $state(true);

	// Get teams to display based on filter
	const teamsToShow = $derived(() => {
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup) {
			return sortByAssignedTeams(includedTeams, currentJudgeGroup.assignedTeams);
		} else {
			return sortByTeamNumber(Object.values(includedTeams));
		}
	});

	// Function to update notebook development status
	async function updateNotebookStatus(teamId: string, isDeveloped: boolean | null) {
		try {
			await app.wrpcClient.team.updateTeamData.mutation({ ...includedTeams[teamId], isDevelopedNotebook: isDeveloped });
		} catch (error) {
			app.addErrorNotice('Failed to update notebook status');
		}
	}

	// Function to open notebook rubric for a team
	function openNotebookRubric(teamId: string) {
		const existingTab = tabs.findTab('notebook_rubric');
		if (existingTab) {
			tabs.switchToTab(existingTab.id);
		} else {
			tabs.addTab(new NotebookRubricTab({ teamId }));
		}
	}

	// Open team data edit dialog
	function openEditTeamDataDialog(team: any) {
		dialogs.showCustom(EditTeamDataDialog, { props: { team } });
	}
</script>

<div class="h-full overflow-auto p-4 sm:p-6">
	<div class="mx-auto max-w-6xl space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Notebook Sorting</h2>
			<p class="mb-2 text-sm text-gray-600">
				<strong>Instructions:</strong> Judges perform a quick scan of all the Engineering Notebooks and divide them into two categories:
				<b>Developing</b>
				and <b>Fully Developed</b>. If it is unclear whether a notebook should be categorized as Developing or Fully Developed, either
				another Judge can help make that determination or the notebook should be given the benefit of the doubt and categorized as Fully
				Developed.
			</p>
			<p class="mb-4 text-sm text-gray-600">Only <b>Fully Developed</b> notebooks will be able to start the Engineering Notebook Rubric.</p>

			<!-- Filter Controls -->
			{#if isAssignedJudging && currentJudgeGroup}
				<div>
					<label class="flex items-start sm:items-center">
						<input type="checkbox" bind:checked={showOnlyAssignedTeams} class="mr-2 mt-0.5 rounded border-gray-300 sm:mt-0" />
						<span class="text-sm text-gray-700">
							Only show assigned teams for your current judge group ({currentJudgeGroup.name})
						</span>
					</label>
				</div>
			{/if}
		</div>

		<!-- Teams List -->
		<div class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">
				Teams ({teamsToShow().length})
			</h3>

			{#if teamsToShow().length === 0}
				<div class="py-8 text-center text-gray-500">
					{#if isAssignedJudging && showOnlyAssignedTeams}
						No teams are assigned to your judge group.
					{:else}
						No teams found.
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
					{#each teamsToShow() as team (team.id)}
						{@const notebookLink = team.notebookLink || ''}
						{@const isDeveloped = team.isDevelopedNotebook ?? null}

						<div class="rounded-lg border border-gray-200 p-4">
							<div class="flex flex-col space-y-4 md:flex-row md:items-start md:justify-between md:space-y-0">
								<div class="flex-1">
									<div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
										<h4 class="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-medium text-gray-900">
											<span>{team.number} - {team.name}</span>
											{#if team.excluded}
												<span class="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">Excluded from judged awards</span>
											{/if}
											<button
												onclick={() => openEditTeamDataDialog(team)}
												class="text-gray-400 hover:text-gray-600 active:text-gray-800"
												title="Edit team data"
											>
												<EditIcon size={14} />
											</button>
										</h4>
									</div>

									<div class="space-y-1 text-sm text-gray-600">
										<p><strong>School:</strong> {team.school}</p>
										<p><strong>Grade Level:</strong> {team.grade}</p>
										<p><strong>Location:</strong> {team.city}, {team.state}, {team.country}</p>
										<p class="break-all">
											<strong>Notebook Link:</strong>
											{#if notebookLink}
												<a href={notebookLink} target="_blank" class="text-blue-600 underline hover:text-blue-800 active:text-blue-900">
													{notebookLink}
												</a>
											{:else}
												<span class="text-gray-400">(Not provided)</span>
											{/if}
										</p>
									</div>
								</div>

								<div class="flex-shrink-0 md:ml-6">
									<div class="mb-2 text-sm font-medium text-gray-700">Notebook Status:</div>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-1 md:space-y-0">
										<button
											onclick={() => updateNotebookStatus(team.id, true)}
											class="flex items-center justify-center rounded-md border px-3 py-2 text-center text-sm transition-colors {isDeveloped === true
												? 'border-green-300 bg-green-50 text-green-700'
												: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'}"
										>
											<span class="mr-1">✓</span> Fully Developed
										</button>
										<button
											onclick={() => updateNotebookStatus(team.id, false)}
											class="flex items-center justify-center rounded-md border px-3 py-2 text-center text-sm transition-colors {isDeveloped === false
												? 'border-yellow-300 bg-yellow-50 text-yellow-700'
												: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'}"
										>
											<span class="mr-1">⚠</span> Developing
										</button>
										<button
											onclick={() => updateNotebookStatus(team.id, null)}
											class="flex items-center justify-center rounded-md border px-3 py-2 text-center text-sm transition-colors {isDeveloped === null
												? 'border-gray-300 bg-gray-100 text-gray-700'
												: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'}"
										>
											<span class="mr-1">○</span> No Notebook/Not Reviewed
										</button>
									</div>

									{#if isDeveloped === true}
										<div class="mt-3">
											<button onclick={() => openNotebookRubric(team.id)} class="primary tiny w-full touch-manipulation"> Start Notebook Rubric </button>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
