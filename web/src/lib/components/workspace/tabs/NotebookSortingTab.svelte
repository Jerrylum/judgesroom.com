<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import type { NotebookSortingTab } from '$lib/tab.svelte';
	import { sortByAssignedTeams, sortByTeamNumber, readNotebookLinksExcel } from '$lib/team.svelte';
	import NotebookSortingTeam from './NotebookSortingTeam.svelte';
	import type { TeamData } from '@judging.jerryio/protocol/src/team';

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
	const isShowingOnlyAssignedTeams = $derived(isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup);

	// Import state
	let fileInput: HTMLInputElement;
	let importError = $state('');
	let importSuccess = $state('');
	let isImporting = $state(false);

	// Get teams to display based on filter
	const teamsToShow = $derived.by(() => {
		if (isShowingOnlyAssignedTeams) {
			return sortByAssignedTeams(includedTeams, currentJudgeGroup!.assignedTeams);
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

	// Import functions
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			processNotebookLinksFile(file);
		}
	}

	async function processNotebookLinksFile(file: File) {
		if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
			importError = 'Please upload an Excel file (.xlsx or .xls)';
			importSuccess = '';
			return;
		}

		isImporting = true;
		importError = '';
		importSuccess = '';

		try {
			const buffer = await file.arrayBuffer();
			const excelRows = readNotebookLinksExcel(new Uint8Array(buffer));

			// Get all current team data
			const allTeamInfoAndData = app.getAllTeamInfoAndData();

			// Map team numbers to team IDs
			const teamNumberToId = Object.fromEntries(Object.values(allTeamInfoAndData).map((team) => [team.number, team.id]));

			// Prepare team data updates
			const teamDataUpdates: TeamData[] = [];
			let updatedCount = 0;
			let notFoundCount = 0;

			for (const row of excelRows) {
				const teamId = teamNumberToId[row.team];
				if (!teamId) {
					notFoundCount++;
					continue;
				}

				const currentTeamData = allTeamInfoAndData[teamId];
				const notebookLink = row.notebook_link === 'none' ? '' : row.notebook_link;

				teamDataUpdates.push({
					id: teamId,
					notebookLink: notebookLink,
					notebookDevelopmentStatus: currentTeamData.notebookDevelopmentStatus,
					absent: currentTeamData.absent
				});
				updatedCount++;
			}

			// Update team data
			if (teamDataUpdates.length > 0) {
				await app.wrpcClient.team.updateAllTeamData.mutation(teamDataUpdates);
				importSuccess =
					`Successfully updated notebook links for ${updatedCount} teams` +
					(notFoundCount > 0 ? `. ${notFoundCount} teams were not found in the current event.` : '');
			} else {
				importError = 'No teams were found matching the Excel data';
			}
		} catch (error) {
			console.error('Error processing notebook links file:', error);
			importError = `Error processing file: ${error}`;
		} finally {
			isImporting = false;
		}
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
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

		<!-- Import Section -->
		<div class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">Import Digital Engineering Notebook Links report</h3>
			<p class="mb-4 text-sm text-gray-600">
				Download the Excel file from RobotEvents → Event Admin → "Downloads & Links" → "Download Digital Engineering Notebook Links report".
				This will update notebook links for existing teams in your event.
			</p>

			<div class="flex items-center gap-4">
				<button onclick={() => fileInput.click()} disabled={isImporting} class="primary tiny">
					{#if isImporting}
						Importing...
					{:else}
						Import
					{/if}
				</button>

				<input bind:this={fileInput} type="file" accept=".xlsx,.xls" onchange={handleFileSelect} class="hidden" />
			</div>

			<!-- Status Messages -->
			{#if importError}
				<div class="mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-sm text-red-700">
					{importError}
				</div>
			{/if}

			{#if importSuccess}
				<div class="mt-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-sm text-green-700">
					{importSuccess}
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
						<div class="text-base font-medium text-gray-900">Teams Scanned</div>
						{#if isShowingOnlyAssignedTeams}
							<div class="mb-2 text-sm text-gray-900">Your judge group ({currentJudgeGroup!.name})</div>
						{:else}
							<div class="mb-2 text-sm text-gray-900">All judge groups</div>
						{/if}
						<div class="text-lg font-semibold text-gray-700">
							{progressMetrics.scanned.count} / {progressMetrics.scanned.total}
						</div>
						<div class="text-xs text-gray-600">
							{progressMetrics.scanned.total > 0 ? Math.round((progressMetrics.scanned.count / progressMetrics.scanned.total) * 100) : 0}%
						</div>
					</div>

					<div class="rounded-lg bg-gray-50 p-3">
						<div class="text-base font-medium text-gray-900">Fully Developed Notebooks Reviewed</div>
						{#if isShowingOnlyAssignedTeams}
							<div class="mb-2 text-sm text-gray-900">Your judge group ({currentJudgeGroup!.name})</div>
						{:else}
							<div class="mb-2 text-sm text-gray-900">All judge groups</div>
						{/if}
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
						<div class="text-base font-medium text-gray-900">Fully Developed Notebooks Reviewed</div>
						<div class="mb-2 text-sm text-gray-900">Your progress</div>
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
