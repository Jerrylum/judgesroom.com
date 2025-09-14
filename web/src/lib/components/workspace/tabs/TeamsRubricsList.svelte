<script lang="ts">
	import type { TeamInfo } from '@judging.jerryio/protocol/src/team';
	import { app, tabs } from '$lib/app-page.svelte';
	import { NotebookRubricTab, TeamInterviewRubricTab } from '$lib/tab.svelte';

	let { teams }: { teams: readonly TeamInfo[] } = $props();

	// State for rubrics and notes data
	let rubricsData = $state<any[]>([]);
	let loading = $state(true);
	let showOnlyAssignedTeams = $state(true); // Default to true as requested

	// Get essential data and judge info
	const essentialData = $derived(app.getEssentialData());
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');
	const currentJudge = $derived(() => {
		const user = app.getCurrentUser();
		return user?.role === 'judge' ? user.judge : null;
	});
	const currentJudgeGroup = $derived(() => {
		if (!currentJudge()) return null;
		const allJudgeGroups = app.getJudgeGroups();
		return allJudgeGroups.find((group: any) => group.id === currentJudge()?.groupId) || null;
	});
	const allJudges = $derived(app.getAllJudges());

	// Load rubrics data when filter changes
	$effect(() => {
		(async () => {
			try {
				loading = true;
				const judgeGroupId = isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup() ? currentJudgeGroup()!.id : undefined;
				const data = await app.wrpcClient.judging.getRubricsAndNotes.query({ judgeGroupId });
				rubricsData = data;
			} catch (error) {
				console.error('Failed to load rubrics data:', error);
				app.addErrorNotice('Failed to load rubrics data');
			} finally {
				loading = false;
			}
		})();
	});

	// Get team data for a specific team
	function getTeamData(teamId: string) {
		return app.getAllTeamData()[teamId];
	}

	// Get rubrics for a specific team
	function getTeamRubrics(teamId: string) {
		return (
			rubricsData.find((r) => r.teamId === teamId) || {
				engineeringNotebookRubrics: [],
				teamInterviewRubrics: [],
				teamInterviewNotes: []
			}
		);
	}

	// Get notebook status display
	function getNotebookStatus(isDevelopedNotebook: boolean | null | undefined) {
		if (isDevelopedNotebook === true) return { text: 'Fully Developed', class: 'text-green-600' };
		if (isDevelopedNotebook === false) return { text: 'Developing', class: 'text-yellow-600' };
		return { text: 'Not Reviewed', class: 'text-gray-600' };
	}

	// Get judge name by ID
	function getJudgeName(judgeId: string): string {
		const judge = allJudges.find((j) => j.id === judgeId);
		return judge ? judge.name : 'Unknown Judge';
	}

	// Open notebook rubric for a team
	function openNotebookRubric(teamId: string, rubricId?: string) {
		const tab = rubricId ? new NotebookRubricTab({ rubricId }) : new NotebookRubricTab({ teamId });
		tabs.addTab(tab);
		tabs.switchToTab(tab.id);
	}

	// Open team interview rubric for a team
	function openTeamInterviewRubric(teamId: string, rubricId?: string) {
		const tab = rubricId ? new TeamInterviewRubricTab({ rubricId }) : new TeamInterviewRubricTab({ teamId });
		tabs.addTab(tab);
		tabs.switchToTab(tab.id);
	}
</script>

{#if isAssignedJudging && currentJudgeGroup()}
	<div class="mb-4">
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyAssignedTeams}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Only show assigned teams for your current judge group</span>
		</label>
	</div>
{/if}

{#if loading}
	<div class="flex items-center justify-center p-8">
		<div class="text-gray-500">Loading rubrics data...</div>
	</div>
{:else}
	<div class="space-y-4">
		{#each teams as team (team.id)}
			{@const teamData = getTeamData(team.id)}
			{@const teamRubrics = getTeamRubrics(team.id)}
			{@const notebookStatus = getNotebookStatus(teamData?.isDevelopedNotebook)}
			<div class="rounded-lg border border-gray-200 p-4">
				<!-- Team Header -->
				<div class="mb-3 flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold text-gray-900">
							{team.number} - {team.name}
						</h3>
						<p class="text-sm text-gray-600">
							{team.school} • {team.grade}
						</p>
					</div>
					<div class="text-right">
						<div class="text-sm {notebookStatus.class} font-medium">
							{notebookStatus.text}
						</div>
						{#if teamData?.notebookLink && teamData.notebookLink.trim() !== ''}
							<a href={teamData.notebookLink} target="_blank" class="text-sm text-blue-600 underline hover:text-blue-800">
								View Notebook
							</a>
						{:else}
							<div class="text-sm text-gray-400">No notebook link</div>
						{/if}
					</div>
				</div>

				<!-- Rubrics Section -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Engineering Notebook Rubrics -->
					<div class="rounded-lg p-3">
						<h4 class="mb-2 font-medium text-gray-900">Engineering Notebook Rubrics</h4>

						<div class="flex flex-row flex-wrap gap-2">
							{#each teamRubrics.engineeringNotebookRubrics as rubric}
								<button
									onclick={() => openNotebookRubric(team.id, rubric.id)}
									class="rounded-4xl bg-gray-100 px-3 py-1 text-left text-sm hover:bg-gray-200"
								>
									{getJudgeName(rubric.judgeId)}
								</button>
							{/each}
							<button onclick={() => openNotebookRubric(team.id)} class="text-sm text-green-600 underline hover:text-green-800">
								+ New Rubric
							</button>
						</div>
					</div>

					<!-- Team Interview Rubrics -->
					<div class="rounded-lg p-3">
						<h4 class="mb-2 font-medium text-gray-900">Team Interview Rubrics</h4>

						<div class="flex flex-row flex-wrap gap-2">
							{#each teamRubrics.teamInterviewRubrics as rubric}
								<button
									onclick={() => openTeamInterviewRubric(team.id, rubric.id)}
									class="rounded-4xl bg-gray-100 px-3 py-1 text-left text-sm hover:bg-gray-200"
								>
									{getJudgeName(rubric.judgeId)}
								</button>
							{/each}
							<button onclick={() => openTeamInterviewRubric(team.id)} class="text-sm text-green-600 underline hover:text-green-800">
								+ New Rubric
							</button>
						</div>
					</div>
				</div>

				<!-- Team Interview Notes (if any) -->
				{#if teamRubrics.teamInterviewNotes.length > 0}
					<div class="mt-3 rounded-lg bg-blue-50 p-3">
						<h4 class="mb-2 font-medium text-gray-900">Team Interview Notes</h4>
						<div class="space-y-1">
							{#each teamRubrics.teamInterviewNotes as note}
								<div class="text-sm text-gray-700">
									Note by {getJudgeName(note.judgeId)}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
