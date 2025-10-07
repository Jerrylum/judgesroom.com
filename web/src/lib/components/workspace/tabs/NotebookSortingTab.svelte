<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import type { NotebookSortingTab } from '$lib/tab.svelte';
	import { sortByAssignedTeams, sortByTeamNumber } from '$lib/team.svelte';
	import NotebookSortingTeam from './NotebookSortingTeam.svelte';

	interface Props {
		tab: NotebookSortingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());

	// Check if the event uses assigned judging method
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');

	const currentJudge = $derived(app.getCurrentUserJudge());
	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());

	const submittedNotebookRubricsOfCurrentJudge = $derived(
		currentJudge
			? Object.values(subscriptions.allSubmissionCaches)
					.filter((sub) => sub.enrId && sub.judgeId === currentJudge.id)
					.map((sub) => sub.teamId)
			: []
	);

	// State for showing only assigned teams
	let showOnlyAssignedTeams = $state(true);

	// Get teams to display based on filter
	const teamsToShow = $derived.by(() => {
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup) {
			return sortByAssignedTeams(includedTeams, currentJudgeGroup.assignedTeams);
		} else {
			return sortByTeamNumber(Object.values(includedTeams));
		}
	});

	// Calculate progress metrics
	const progressMetrics = $derived.by(() => {
		// 1. Teams scanned (status is not 'undetermined') / total teams showing
		const scannedTeams = teamsToShow.filter((team) => team.notebookDevelopmentStatus !== 'undetermined').length;
		const totalTeams = teamsToShow.length;

		// 2. Teams with submitted notebook rubrics / teams with fully developed notebooks
		const fullyDevelopedTeams = teamsToShow.filter((team) => team.notebookDevelopmentStatus === 'fully_developed');
		const fullyDevelopedCount = fullyDevelopedTeams.length;

		const teamsWithSubmittedRubrics = fullyDevelopedTeams.filter((team) => {
			return Object.values(subscriptions.allSubmissionCaches).some((sub) => sub.enrId && sub.teamId === team.id);
		}).length;

		// 3. Teams current judge finished / teams with fully developed notebooks
		const currentJudgeFinishedCount = fullyDevelopedTeams.filter((team) => submittedNotebookRubricsOfCurrentJudge.includes(team.id)).length;

		return {
			scanned: { count: scannedTeams, total: totalTeams },
			withRubrics: { count: teamsWithSubmittedRubrics, total: fullyDevelopedCount },
			currentJudgeFinished: { count: currentJudgeFinishedCount, total: fullyDevelopedCount }
		};
	});
</script>

<div class="h-full overflow-auto p-4 sm:p-6">
	<div class="mx-auto max-w-5xl space-y-6">
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
				Teams ({teamsToShow.length})
			</h3>

			<div class="mb-4">
				<!-- Progress Indicators -->
				<div class="grid gap-4 sm:grid-cols-3">
					<div class="rounded-lg bg-gray-50 p-3">
						<div class="text-sm font-medium text-gray-900">Teams Scanned</div>
						<div class="text-lg font-semibold text-gray-700">
							{progressMetrics.scanned.count} / {progressMetrics.scanned.total}
						</div>
						<div class="text-xs text-gray-600">
							{progressMetrics.scanned.total > 0 ? Math.round((progressMetrics.scanned.count / progressMetrics.scanned.total) * 100) : 0}%
						</div>
					</div>

					<div class="rounded-lg bg-gray-50 p-3">
						<div class="text-sm font-medium text-gray-900">Teams with Rubrics</div>
						<div class="text-lg font-semibold text-gray-700">
							{progressMetrics.withRubrics.count} / {progressMetrics.withRubrics.total}
						</div>
						<div class="text-xs text-gray-600">
							{progressMetrics.withRubrics.total > 0
								? Math.round((progressMetrics.withRubrics.count / progressMetrics.withRubrics.total) * 100)
								: 0}%
						</div>
					</div>

					<div class="rounded-lg bg-gray-50 p-3">
						<div class="text-sm font-medium text-gray-900">Your Progress</div>
						<div class="text-lg font-semibold text-gray-700">
							{progressMetrics.currentJudgeFinished.count} / {progressMetrics.currentJudgeFinished.total}
						</div>
						<div class="text-xs text-gray-600">
							{progressMetrics.currentJudgeFinished.total > 0
								? Math.round((progressMetrics.currentJudgeFinished.count / progressMetrics.currentJudgeFinished.total) * 100)
								: 0}%
						</div>
					</div>
				</div>
			</div>

			{#if teamsToShow.length === 0}
				<div class="py-8 text-center text-gray-500">
					{#if isAssignedJudging && showOnlyAssignedTeams}
						No teams are assigned to your judge group.
					{:else}
						No teams found.
					{/if}
				</div>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each teamsToShow as team (team.id)}
						<NotebookSortingTeam {team} isSubmitted={submittedNotebookRubricsOfCurrentJudge.includes(team.id)} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
