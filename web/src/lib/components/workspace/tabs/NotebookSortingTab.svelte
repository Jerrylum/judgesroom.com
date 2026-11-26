<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { app, subscriptions } from '#lib/index.svelte.ts';
	import type { NotebookSortingTab } from '#lib/tab.svelte.ts';
	import { sortByAssignedTeams, sortByTeamNumber, readNotebookLinksExcel } from '#lib/team.svelte.ts';
	import NotebookSortingTeamGrid from './NotebookSortingTeamGrid.svelte';
	import NotebookSortingTeamTable from './NotebookSortingTeamTable.svelte';
	import GridViewIcon from '#lib/icon/GridViewIcon.svelte';
	import ColumnViewIcon from '#lib/icon/ColumnViewIcon.svelte';
	import { type TeamData } from '@judgesroom.com/protocol/src/team';
	import { notebookSortingControls } from '#lib/notebook-status.ts';
	import { sanitizeHTMLMessage } from '#lib/i18n.ts';
	import { errorToString } from '#lib/utils.svelte.ts';

	interface Props {
		tab: NotebookSortingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());

	// Check if the event uses assigned judging method
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');
	const notebookSubmissionMethod = $derived(essentialData?.notebookSubmissionMethod ?? 'digital');
	const isDigitalNotebook = $derived(notebookSubmissionMethod === 'digital');

	const currentJudge = $derived(app.getCurrentUserJudge());
	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());

	const submittedNotebookByTeam = $derived.by(() => {
		const byTeam: Record<string, { rubricId: string; score: number | null }> = {};
		if (!currentJudge) return byTeam;

		for (const sub of Object.values(subscriptions.allSubmissionCaches)) {
			if (!sub.enrId || sub.judgeId !== currentJudge.id) continue;
			// Later entries overwrite earlier ones. Object order is insertion order, not submission time.
			byTeam[sub.teamId] = { rubricId: sub.enrId, score: sub.score };
		}

		return byTeam;
	});

	// State for showing only assigned teams
	let showOnlyAssignedTeams = $state(true);
	const isShowingOnlyAssignedTeams = $derived(isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup);

	// State for showing only fully developed notebooks
	let showOnlyFullyDeveloped = $state(false);

	// View mode state - stored in preferences
	const viewMode = $derived(app.getPreferences().get('notebookSortingTabViewMode'));

	// Import state
	let fileInput: HTMLInputElement;
	let importError = $state('');
	let importSuccess = $state('');
	let isImporting = $state(false);

	// Get teams to display based on filter
	const teamsToShow = $derived.by(() => {
		let teams;
		if (isShowingOnlyAssignedTeams) {
			teams = sortByAssignedTeams(includedTeams, currentJudgeGroup!.assignedTeams);
		} else {
			teams = sortByTeamNumber(Object.values(includedTeams));
		}

		// Apply fully developed filter if enabled
		if (showOnlyFullyDeveloped) {
			teams = teams.filter((team) => team.notebookDevelopmentStatus === 'fully_developed');
		}

		return teams;
	});

	// Calculate progress metrics
	const progressMetrics = $derived.by(() => {
		// 1. Teams scanned (status is not 'undetermined') / total teams showing
		const scannedTeams = teamsToShow.filter((team) => team.notebookDevelopmentStatus !== 'undetermined').length;
		const totalTeams = teamsToShow.length;

		// Notebooks that can start a rubric, and how many of those have a saved rubric.
		const rubricTeams = teamsToShow.filter(
			(team) => notebookSortingControls(notebookSubmissionMethod, team.notebookDevelopmentStatus).showStartRubric
		);
		const teamsWithSubmittedRubrics = rubricTeams.filter((team) => {
			return Object.values(subscriptions.allSubmissionCaches).some((sub) => sub.enrId && sub.teamId === team.id);
		}).length;
		const currentJudgeFinishedCount = rubricTeams.filter((team) => submittedNotebookByTeam[team.id] !== undefined).length;

		const submittedNotebooks = teamsToShow.filter((team) => {
			const status = team.notebookDevelopmentStatus;
			return status === 'turned_in' || status === 'developing' || status === 'fully_developed';
		}).length;

		return {
			scanned: { count: scannedTeams, total: totalTeams },
			submitted: { count: submittedNotebooks, total: totalTeams },
			withRubrics: { count: teamsWithSubmittedRubrics, total: rubricTeams.length },
			currentJudgeFinished: { count: currentJudgeFinishedCount, total: rubricTeams.length }
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
			const excel = readNotebookLinksExcel(new Uint8Array(buffer));
			const excelRows = excel.rows;

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
					hasInnovateAwardSubmissionForm: currentTeamData.hasInnovateAwardSubmissionForm,
					notebookDevelopmentStatus: currentTeamData.notebookDevelopmentStatus,
					absent: currentTeamData.absent
				});
				updatedCount++;
			}

			if (excel.errors.length > 0) {
				const shown = excel.errors.slice(0, 5).join('; ');
				const extra = excel.errors.length > 5 ? `; and ${excel.errors.length - 5} more` : '';
				importError = m.notebook_links_import_error_message({ error: `${shown}${extra}` });
			} else if (teamDataUpdates.length === 0) {
				importError = m.notebook_links_import_error();
			}

			// Update team data
			if (teamDataUpdates.length > 0) {
				await app.wrpcClient.team.updateAllTeamData.mutation(teamDataUpdates);
				importSuccess = m.notebook_links_import_success({ count: updatedCount, notFoundCount: notFoundCount });
			}
		} catch (error) {
			console.error('Error processing notebook links file:', error);
			importError = m.notebook_links_import_error_message({ error: errorToString(error) });
		} finally {
			isImporting = false;
		}
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">{m.notebook_sorting_title()}</h2>
			<p class="mb-2 text-sm text-gray-600">
				{@html sanitizeHTMLMessage(isDigitalNotebook ? m.notebook_sorting_description1_digital : m.notebook_sorting_description1_physical)}
			</p>
			<p class="mb-2 text-sm text-gray-600">
				{@html sanitizeHTMLMessage(m.notebook_sorting_description2)}
			</p>
			<p class="mb-2 text-sm text-gray-600">
				{@html sanitizeHTMLMessage(m.notebook_sorting_description3)}
			</p>
			<p class="mb-2 text-sm text-gray-600">
				{@html sanitizeHTMLMessage(m.notebook_sorting_description4)}
			</p>
		</div>

		<!-- Import Section -->
		<div class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">{m.notebook_sorting_import_title()}</h3>
			{#if isDigitalNotebook}
				<p class="mb-4 text-sm text-gray-600">
					{m.notebook_sorting_import_description1()}
				</p>

				<div class="flex items-center gap-4">
					<button onclick={() => fileInput.click()} disabled={isImporting} class="primary tiny">
						{#if isImporting}
							{m.importing()}
						{:else}
							{m.import_button()}
						{/if}
					</button>

					<input bind:this={fileInput} type="file" accept=".xlsx,.xls" onchange={handleFileSelect} class="hidden" />
				</div>
			{:else}
				<p class="text-sm text-gray-600">{m.notebook_sorting_import_physical_only()}</p>
			{/if}

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
				{m.teams_count({ count: teamsToShow.length })}
			</h3>

			<div class="mb-4">
				<!-- Filter Controls -->

				<div class="mt-4 flex flex-col gap-2">
					{#if isAssignedJudging && currentJudgeGroup}
						<div>
							<label class="flex items-start sm:items-center">
								<input type="checkbox" bind:checked={showOnlyAssignedTeams} class="mt-0.5 mr-2 rounded border-gray-300 sm:mt-0" />
								<span class="text-sm text-gray-700">
									{m.only_show_assigned_teams_for_your_current_judge_group({ name: currentJudgeGroup.name })}
								</span>
							</label>
						</div>
					{/if}
					<div>
						<label class="flex items-start sm:items-center">
							<input type="checkbox" bind:checked={showOnlyFullyDeveloped} class="mt-0.5 mr-2 rounded border-gray-300 sm:mt-0" />
							<span class="text-sm text-gray-700">{m.only_show_fully_developed_notebooks()}</span>
						</label>
					</div>
				</div>

				<!-- Progress Indicators -->
				<div class={['mt-4 grid gap-4', isDigitalNotebook ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4']}>
					<div class="rounded-lg bg-gray-50 p-3">
						<div class="text-base font-medium text-gray-900">{m.teams_scanned()}</div>
						{#if isShowingOnlyAssignedTeams}
							<div class="mb-2 text-sm text-gray-900">{m.your_judge_group({ name: currentJudgeGroup!.name })}</div>
						{:else}
							<div class="mb-2 text-sm text-gray-900">{m.all_judge_groups()}</div>
						{/if}
						<div class="text-lg font-semibold text-gray-700">
							{progressMetrics.scanned.count} / {progressMetrics.scanned.total}
						</div>
						<div class="text-xs text-gray-600">
							{progressMetrics.scanned.total > 0 ? Math.round((progressMetrics.scanned.count / progressMetrics.scanned.total) * 100) : 0}%
						</div>
					</div>

					{#if !isDigitalNotebook}
						<div class="rounded-lg bg-gray-50 p-3">
							<div class="text-base font-medium text-gray-900">{m.submitted_notebooks()}</div>
							{#if isShowingOnlyAssignedTeams}
								<div class="mb-2 text-sm text-gray-900">{m.your_judge_group({ name: currentJudgeGroup!.name })}</div>
							{:else}
								<div class="mb-2 text-sm text-gray-900">{m.all_judge_groups()}</div>
							{/if}
							<div class="text-lg font-semibold text-gray-700">
								{progressMetrics.submitted.count} / {progressMetrics.submitted.total}
							</div>
							<div class="text-xs text-gray-600">
								{progressMetrics.submitted.total > 0
									? Math.round((progressMetrics.submitted.count / progressMetrics.submitted.total) * 100)
									: 0}%
							</div>
						</div>
					{/if}

					<div class="rounded-lg bg-gray-50 p-3">
						<div class="text-base font-medium text-gray-900">{m.notebooks_rubric_completed()}</div>
						{#if isShowingOnlyAssignedTeams}
							<div class="mb-2 text-sm text-gray-900">{m.your_judge_group({ name: currentJudgeGroup!.name })}</div>
						{:else}
							<div class="mb-2 text-sm text-gray-900">{m.all_judge_groups()}</div>
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
						<div class="text-base font-medium text-gray-900">{m.notebooks_rubric_completed()}</div>
						<div class="mb-2 text-sm text-gray-900">{m.your_progress()}</div>
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

				<!-- View Toggle Buttons -->
				<div class="mt-4 flex justify-end gap-2">
					<button
						onclick={() => app.getPreferences().set('notebookSortingTabViewMode', 'grid')}
						class="tiny flex items-center gap-2"
						class:primary={viewMode === 'grid'}
						class:lightweight={viewMode !== 'grid'}
						title="Switch to grid view"
					>
						<GridViewIcon size={16} />
						{m.grid_view()}
					</button>
					<button
						onclick={() => app.getPreferences().set('notebookSortingTabViewMode', 'column')}
						class="tiny flex items-center gap-2"
						class:primary={viewMode === 'column'}
						class:lightweight={viewMode !== 'column'}
						title="Switch to column view"
					>
						<ColumnViewIcon size={16} />
						{m.column_view()}
					</button>
				</div>
			</div>

			{#if teamsToShow.length === 0}
				<div class="py-8 text-center text-gray-500">
					{#if isAssignedJudging && showOnlyAssignedTeams}
						{m.no_teams_assigned_to_your_judge_group()}
					{:else}
						{m.no_teams_found()}
					{/if}
				</div>
			{:else if viewMode === 'grid'}
				<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{#each teamsToShow as team (team.id)}
						<NotebookSortingTeamGrid {team} {notebookSubmissionMethod} submittedNotebook={submittedNotebookByTeam[team.id] ?? null} />
					{/each}
				</div>
			{:else}
				<NotebookSortingTeamTable teams={teamsToShow} {submittedNotebookByTeam} {notebookSubmissionMethod} />
			{/if}
		</div>
	</div>
</div>
