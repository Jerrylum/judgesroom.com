<script lang="ts">
	import './teams-rubrics-list.css';
	import { app, subscriptions, tabs } from '$lib/index.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import { NotebookRubricTab, TeamInterviewRubricTab } from '$lib/tab.svelte';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import { mergeArrays } from '$lib/utils.svelte';
	import type { Submission } from '@judgesroom.com/protocol/src/rubric';
	import type { NotebookDevelopmentStatus } from '@judgesroom.com/protocol/src/team';
	import QRCodeButton from './QRCodeButton.svelte';

	const teams = $derived(app.getAllTeamInfoAndData());

	interface SubmissionWithScore extends Submission {
		score: number | null;
	}

	interface RubricsAndNotesPerTeam {
		engineeringNotebookRubrics: SubmissionWithScore[];
		teamInterviewRubrics: SubmissionWithScore[];
		teamInterviewNotes: SubmissionWithScore[];
	}

	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');
	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());
	let showOnlyAssignedTeams = $state(true); // Default to true as requested
	let showOnlyFullyDeveloped = $state(false);
	let showOnlyInterviewed = $state(false);

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	const teamList = $derived.by(() => {
		let teamIdsInOrder: string[] = [];
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup) {
			const assignedTeams = currentJudgeGroup.assignedTeams;
			const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[currentJudgeGroup.id] ?? [];
			teamIdsInOrder = mergeArrays(assignedTeams, reviewedTeams);
		} else {
			teamIdsInOrder = sortByTeamNumber(Object.values(includedTeams)).map((team) => team.id);
		}

		// Apply filters
		if (showOnlyFullyDeveloped || showOnlyInterviewed) {
			teamIdsInOrder = teamIdsInOrder.filter((teamId) => {
				const team = teams[teamId];
				if (!team) return false;

				let passesFilter = true;

				if (showOnlyFullyDeveloped) {
					passesFilter = passesFilter && team.notebookDevelopmentStatus === 'fully_developed';
				}

				if (showOnlyInterviewed) {
					const teamRubricsAndNotes = data[teamId] ?? getEmptyRubricsAndNotesPerTeam();
					passesFilter = passesFilter && teamRubricsAndNotes.teamInterviewRubrics.length > 0;
				}

				return passesFilter;
			});
		}

		return teamIdsInOrder;
	});

	const data = $derived.by(() => {
		const rtn: Record<string, RubricsAndNotesPerTeam> = {};

		const submissionCaches = Object.values(subscriptions.allSubmissionCaches);

		for (const sub of submissionCaches) {
			const target = rtn[sub.teamId] || {
				engineeringNotebookRubrics: [],
				teamInterviewRubrics: [],
				teamInterviewNotes: []
			};
			if (sub.enrId) {
				target.engineeringNotebookRubrics.push({
					id: sub.enrId,
					judgeId: sub.judgeId,
					score: sub.score
				});
			}
			if (sub.tiId) {
				target.teamInterviewRubrics.push({
					id: sub.tiId,
					judgeId: sub.judgeId,
					score: sub.score
				});
			}
			if (sub.tnId) {
				target.teamInterviewNotes.push({
					id: sub.tnId,
					judgeId: sub.judgeId,
					score: sub.score
				});
			}
			rtn[sub.teamId] = target;
		}

		return rtn;
	});

	function getEmptyRubricsAndNotesPerTeam(): RubricsAndNotesPerTeam {
		return {
			engineeringNotebookRubrics: [],
			teamInterviewRubrics: [],
			teamInterviewNotes: []
		};
	}

	// Get notebook status display
	function getNotebookStatus(notebookDevelopmentStatus: NotebookDevelopmentStatus) {
		if (notebookDevelopmentStatus === 'fully_developed') return { text: 'Fully Developed', class: 'text-green-600' };
		if (notebookDevelopmentStatus === 'developing') return { text: 'Developing', class: 'text-yellow-600' };
		return { text: 'No Notebook/Not Reviewed', class: 'text-gray-600' };
	}

	// Get judge name by ID
	function getJudgeName(judgeId: string): string {
		return app.findJudgeById(judgeId)?.name ?? 'Unknown Judge';
	}

	// Open notebook rubric for a team
	function openNotebookRubric(teamId: string, rubricId?: string) {
		const tab = rubricId ? new NotebookRubricTab({ rubricId }) : new NotebookRubricTab({ teamId });
		tabs.addOrReuseTab(tab);
	}

	// Open team interview rubric for a team
	function openTeamInterviewRubric(teamId: string, rubricId?: string) {
		const tab = rubricId ? new TeamInterviewRubricTab({ rubricId }) : new TeamInterviewRubricTab({ teamId });
		tabs.addOrReuseTab(tab);
	}

	// Calculate progress metrics
	const progressMetrics = $derived.by(() => {
		const teamsToShow = teamList.map((teamId) => teams[teamId]).filter((team) => team);

		// 1. Teams scanned (status is not 'undetermined') / total teams showing
		const scannedTeams = teamsToShow.filter((team) => team.notebookDevelopmentStatus !== 'undetermined').length;
		const totalTeams = teamsToShow.length;

		// 2. Teams with submitted notebook rubrics / teams with fully developed notebooks
		const fullyDevelopedTeams = teamsToShow.filter((team) => team.notebookDevelopmentStatus === 'fully_developed');
		const fullyDevelopedCount = fullyDevelopedTeams.length;

		const fullyDevelopedWithRubrics = fullyDevelopedTeams.filter((team) => {
			const teamRubricsAndNotes = data[team.id] ?? getEmptyRubricsAndNotesPerTeam();
			return teamRubricsAndNotes.engineeringNotebookRubrics.length > 0;
		}).length;

		const teamsInterviewed = teamsToShow.filter((team) => {
			const teamRubricsAndNotes = data[team.id] ?? getEmptyRubricsAndNotesPerTeam();
			return teamRubricsAndNotes.teamInterviewRubrics.length > 0;
		}).length;

		const presentTeams = teamsToShow.filter((team) => !team.absent).length;

		return {
			scanned: { count: scannedTeams, total: totalTeams },
			fullyDevelopedWithRubrics: { count: fullyDevelopedWithRubrics, total: fullyDevelopedCount },
			teamsInterviewed: { count: teamsInterviewed, total: presentTeams }
		};
	});
</script>

<div class="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
	<h2 class="text-lg font-medium text-gray-900">Teams & Rubrics</h2>
</div>

<div class="mb-4 flex flex-col gap-2">
	{#if isAssignedJudging && currentJudgeGroup}
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyAssignedTeams}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Only show assigned teams for your current judge group ({currentJudgeGroup.name})</span>
		</label>
	{/if}

	<div>
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyFullyDeveloped}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Only show teams with fully developed notebooks</span>
		</label>
	</div>
	<div>
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyInterviewed}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Only show teams that have been interviewed</span>
		</label>
	</div>
</div>

<!-- Progress Indicators -->
<div class="mb-4">
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
			<div class="text-sm font-medium text-gray-900">Fully Developed Notebooks Reviewed</div>
			<div class="text-lg font-semibold text-gray-700">
				{progressMetrics.fullyDevelopedWithRubrics.count} / {progressMetrics.fullyDevelopedWithRubrics.total}
			</div>
			<div class="text-xs text-gray-600">
				{progressMetrics.fullyDevelopedWithRubrics.total > 0
					? Math.round((progressMetrics.fullyDevelopedWithRubrics.count / progressMetrics.fullyDevelopedWithRubrics.total) * 100)
					: 0}%
			</div>
		</div>

		<div class="rounded-lg bg-gray-50 p-3">
			<div class="text-sm font-medium text-gray-900">Teams Interviewed</div>
			<div class="text-lg font-semibold text-gray-700">
				{progressMetrics.teamsInterviewed.count} / {progressMetrics.teamsInterviewed.total}
			</div>
			<div class="text-xs text-gray-600">
				{progressMetrics.teamsInterviewed.total > 0
					? Math.round((progressMetrics.teamsInterviewed.count / progressMetrics.teamsInterviewed.total) * 100)
					: 0}%
			</div>
		</div>
	</div>
</div>

<div class="lg:hidden! mb-2 flex flex-row justify-end gap-2 text-sm">
	<button class="lightweight tiny" onclick={scrollLeft}>Scroll Left</button>
	<button class="lightweight tiny" onclick={scrollRight}>Scroll Right</button>
</div>

<teams-rubrics-table>
	<table-header>
		<team>TEAM NUMBER</team>
		<scroll-container use:registerScrollContainer class="bg-gray-200">
			<content>
				<div class="flex min-w-40 max-w-40 flex-col items-center justify-center">NOTEBOOK LINK</div>
				<div class="min-w-85 max-w-85 flex items-center justify-center">NOTEBOOK RUBRICS</div>
				<div class="min-w-85 max-w-85 flex items-center justify-center">TEAM INTERVIEW RUBRICS</div>
			</content>
		</scroll-container>
	</table-header>

	<table-body>
		{#each teamList as teamId (teamId)}
			{@const team = teams[teamId]}
			{@const teamRubricsAndNotes = data[teamId] ?? getEmptyRubricsAndNotesPerTeam()}
			{@const notebookStatus = getNotebookStatus(team.notebookDevelopmentStatus)}
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
						<div class="flex min-w-40 max-w-40 items-center gap-2 p-2">
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
								<span class="text-xs text-gray-400">No notebook link</span>
							{/if}
						</div>

						<!-- Notebook Rubrics Column -->
						<div class="min-w-85 max-w-85 flex items-center justify-center overflow-hidden">
							<div class="flex flex-row justify-center gap-1 p-1">
								{#if team.notebookDevelopmentStatus === 'fully_developed'}
									{#each teamRubricsAndNotes.engineeringNotebookRubrics as rubric}
										<button
											onclick={() => openNotebookRubric(team.id, rubric.id)}
											title={getJudgeName(rubric.judgeId)}
											class="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 text-sm hover:bg-gray-200 active:bg-gray-300"
										>
											{rubric.score !== null ? ` ${rubric.score}` : getJudgeName(rubric.judgeId)}
										</button>
									{/each}
								{:else}
									<div class="text-xs {notebookStatus.class} px-2 py-0.5">
										{notebookStatus.text}
									</div>
								{/if}
							</div>
						</div>

						<!-- Team Interview Rubrics Column -->
						<div class="min-w-85 max-w-85 flex items-center justify-center overflow-hidden">
							<div class="flex flex-row justify-center gap-1 p-1">
								{#each teamRubricsAndNotes.teamInterviewRubrics as rubric}
									<button
										onclick={() => openTeamInterviewRubric(team.id, rubric.id)}
										title={getJudgeName(rubric.judgeId)}
										class="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 text-sm hover:bg-gray-200 active:bg-gray-300"
									>
										{rubric.score !== null ? ` ${rubric.score}` : getJudgeName(rubric.judgeId)}
									</button>
								{/each}
							</div>
						</div>
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</teams-rubrics-table>
