<script lang="ts">
	import { app, tabs } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { NotebookSortingTab } from '$lib/tab.svelte';
	import { NotebookRubricTab } from '$lib/tab.svelte';
	import { sortByAssignedTeams, sortByIsDevelopedNotebook, sortByTeamNumber } from '$lib/team.svelte';

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
</script>

<Tab {isActive} tabId={tab.id}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-6xl space-y-6">
			<!-- Header -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">Notebook Sorting</h2>
				<p class="mb-2 text-sm text-gray-600">
					<strong>Instructions:</strong> Judges perform a quick scan of all the Engineering Notebooks and divide them into two categories:
					<b>Developing</b>
					and <b>Fully Developed</b>. If it is unclear whether a notebook should be categorized as Developing or Fully Developed, either
					another Judge can help make that determination or the notebook should be given the benefit of the doubt and categorized as Fully
					Developed.
				</p>
				<p class="mb-4 text-sm text-gray-600">Only <b>Fully Developed</b> notebooks will be completed the Engineering Notebook Rubric.</p>

				<!-- Filter Controls -->
				{#if isAssignedJudging && currentJudgeGroup}
					<div>
						<label class="flex items-center">
							<input type="checkbox" bind:checked={showOnlyAssignedTeams} class="mr-2 rounded border-gray-300" />
							<span class="text-sm text-gray-700">
								Only show assigned teams for your current judge group ({currentJudgeGroup.name})
							</span>
						</label>
					</div>
				{/if}
			</div>

			<!-- Teams List -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
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
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="mb-2 flex items-center space-x-4">
											<h4 class="text-lg font-medium text-gray-900">
												{team.number} - {team.name}
											</h4>
											{#if team.excluded}
												<span class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">Excluded</span>
											{/if}
										</div>

										<div class="space-y-1 text-sm text-gray-600">
											<p><strong>School:</strong> {team.school}</p>
											<p><strong>Grade Level:</strong> {team.grade}</p>
											<p><strong>Location:</strong> {team.city}, {team.state}, {team.country}</p>
											<p>
												<strong>Notebook Link:</strong>
												{#if notebookLink}
													<a href={notebookLink} target="_blank" class="text-blue-600 underline hover:text-blue-800">
														{notebookLink}
													</a>
												{:else}
													<span class="text-gray-400">(Not provided)</span>
												{/if}
											</p>
										</div>
									</div>

									<div class="ml-6 flex-shrink-0">
										<div class="mb-2 text-sm font-medium text-gray-700">Notebook Status:</div>
										<div class="space-y-2">
											<button
												onclick={() => updateNotebookStatus(team.id, true)}
												class="block w-full rounded-md border px-3 py-2 text-left text-sm {isDeveloped === true
													? 'border-green-300 bg-green-50 text-green-700'
													: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
											>
												✓ Fully Developed
											</button>
											<button
												onclick={() => updateNotebookStatus(team.id, false)}
												class="block w-full rounded-md border px-3 py-2 text-left text-sm {isDeveloped === false
													? 'border-gray-300 bg-gray-100 text-gray-700'
													: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
											>
												⚠ Developing
											</button>
											<button
												onclick={() => updateNotebookStatus(team.id, null)}
												class="block w-full rounded-md border px-3 py-2 text-left text-sm {isDeveloped === null
													? 'border-gray-300 bg-gray-100 text-gray-700'
													: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
											>
												○ No Notebook/Not Reviewed
											</button>
										</div>

										{#if isDeveloped === true}
											<div class="mt-3">
												<button onclick={() => openNotebookRubric(team.id)} class="primary tiny w-full"> Start Notebook Rubric </button>
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
</Tab>
