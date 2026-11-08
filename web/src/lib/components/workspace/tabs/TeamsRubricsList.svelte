<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import './teams-rubrics-list.css';
	import { app, subscriptions, tabs } from '$lib/index.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import { NotebookRubricTab, TeamInterviewRubricTab } from '$lib/tab.svelte';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import type { Submission } from '@judgesroom.com/protocol/src/rubric';
	import { isSubmittedNotebook, type NotebookDevelopmentStatus } from '@judgesroom.com/protocol/src/team';
	import QRCodeButton from './QRCodeButton.svelte';
	import TeamPhotoAlbum from '../TeamPhotoAlbum.svelte';

	interface Props {
		subscriptionScope: 'all_judge_groups' | 'current_judge_group';
	}

	let { subscriptionScope = $bindable() }: Props = $props();

	const teams = $derived(app.getAllTeamInfoAndData());
	const currentJudgeId = $derived.by(() => {
		const currentUser = app.getCurrentUser();
		return currentUser?.role === 'judge' ? currentUser.judge.id : null;
	});

	interface SubmissionWithScore extends Submission {
		score: number | null;
	}

	interface RubricsAndNotesPerTeam {
		engineeringNotebookRubrics: SubmissionWithScore[];
		teamInterviewRubrics: SubmissionWithScore[];
	}

	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');
	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());
	let showOnlyAssignedTeams = $state(true); // Default to true as requested
	let showOnlyFullyDeveloped = $state(false);
	let showOnlyInterviewed = $state(false);

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	$effect(() => {
		subscriptionScope = showOnlyAssignedTeams ? 'current_judge_group' : 'all_judge_groups';
	});

	const teamList = $derived.by(() => {
		let teamIdsInOrder: string[] = [];
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup) {
			teamIdsInOrder = currentJudgeGroup.assignedTeams;
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
				teamInterviewRubrics: []
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
			rtn[sub.teamId] = target;
		}

		return rtn;
	});

	function getEmptyRubricsAndNotesPerTeam(): RubricsAndNotesPerTeam {
		return {
			engineeringNotebookRubrics: [],
			teamInterviewRubrics: []
		};
	}

	// Get notebook status display
	function getNotebookStatus(notebookDevelopmentStatus: NotebookDevelopmentStatus) {
		if (notebookDevelopmentStatus === 'fully_developed') return { text: m.fully_developed_notebook_status(), class: 'text-green-600' };
		if (notebookDevelopmentStatus === 'developing') return { text: m.developing_notebook_status(), class: 'text-yellow-600' };
		return { text: m.no_notebook_or_not_reviewed(), class: 'text-gray-600' };
	}

	// Get judge name by ID
	function getJudgeName(judgeId: string): string {
		return app.findJudgeById(judgeId)?.name ?? m.unknown_judge();
	}

	function rubricChipText(rubric: SubmissionWithScore): string {
		const text = rubric.score !== null ? String(rubric.score) : getJudgeName(rubric.judgeId);
		if (currentJudgeId !== null && rubric.judgeId === currentJudgeId) {
			return `${text} (${m.you()})`;
		}
		return text;
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

		// 2. Teams with submitted notebook rubrics / evaluable notebooks (Developing + Fully Developed)
		const evaluableTeams = teamsToShow.filter((team) => isSubmittedNotebook(team.notebookDevelopmentStatus));
		const evaluableCount = evaluableTeams.length;

		const evaluableWithRubrics = evaluableTeams.filter((team) => {
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
			evaluableWithRubrics: { count: evaluableWithRubrics, total: evaluableCount },
			teamsInterviewed: { count: teamsInterviewed, total: presentTeams }
		};
	});
</script>

{#snippet newRubricButton(start: () => void)}
	<button
		type="button"
		onclick={start}
		title={m.new_rubric()}
		aria-label={m.new_rubric()}
		class="flex h-8 w-6 shrink-0 items-center justify-center bg-transparent p-0 text-gray-500 hover:text-gray-900"
	>
		<svg viewBox="0 0 16 16" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<path d="M8 3v10M3 8h10" />
		</svg>
	</button>
{/snippet}

<div class="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
	<h2 class="text-lg font-medium text-gray-900">{m.teams_and_rubrics()}</h2>
</div>

<div class="mb-4 flex flex-col gap-2">
	{#if isAssignedJudging && currentJudgeGroup}
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyAssignedTeams}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">{m.only_show_assigned_teams_for_your_current_judge_group({ name: currentJudgeGroup.name })}</span>
		</label>
	{/if}

	<div>
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyFullyDeveloped}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">{m.only_show_fully_developed_notebooks()}</span>
		</label>
	</div>
	<div>
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyInterviewed}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">{m.only_show_interviewed_teams()}</span>
		</label>
	</div>
</div>

<!-- Progress Indicators -->
<div class="mb-4">
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-lg bg-gray-50 p-3">
			<div class="text-sm font-medium text-gray-900">{m.teams_scanned()}</div>
			<div class="text-lg font-semibold text-gray-700">
				{progressMetrics.scanned.count} / {progressMetrics.scanned.total}
			</div>
			<div class="text-xs text-gray-600">
				{progressMetrics.scanned.total > 0 ? Math.round((progressMetrics.scanned.count / progressMetrics.scanned.total) * 100) : 0}%
			</div>
		</div>

		<div class="rounded-lg bg-gray-50 p-3">
			<div class="text-sm font-medium text-gray-900">{m.notebooks_rubric_completed()}</div>
			<div class="text-lg font-semibold text-gray-700">
				{progressMetrics.evaluableWithRubrics.count} / {progressMetrics.evaluableWithRubrics.total}
			</div>
			<div class="text-xs text-gray-600">
				{progressMetrics.evaluableWithRubrics.total > 0
					? Math.round((progressMetrics.evaluableWithRubrics.count / progressMetrics.evaluableWithRubrics.total) * 100)
					: 0}%
			</div>
		</div>

		<div class="rounded-lg bg-gray-50 p-3">
			<div class="text-sm font-medium text-gray-900">{m.teams_interviewed()}</div>
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

<div class="mb-2 flex flex-row justify-end gap-2 text-sm lg:hidden!">
	<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
</div>

<teams-rubrics-table>
	<table-header>
		<team>{m.team_number()}</team>
		<scroll-container use:registerScrollContainer class="bg-gray-200">
			<content>
				<div class="flex max-w-40 min-w-40 flex-col items-center justify-center">{m.notebook_link_table()}</div>
				<div class="flex max-w-74 min-w-74 items-center justify-center">{m.notebook_rubrics_table()}</div>
				<div class="flex max-w-74 min-w-74 items-center justify-center">{m.team_interview_rubrics_table()}</div>
				<div class="flex max-w-20 min-w-20 items-center justify-center">{m.photos_album()}</div>
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
						<div class="flex max-w-40 min-w-40 items-center gap-2 p-2">
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

						<!-- Notebook Rubrics Column -->
						<div class="flex max-w-74 min-w-74 items-center">
							<div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 p-1">
								{#if isSubmittedNotebook(team.notebookDevelopmentStatus)}
									{#each teamRubricsAndNotes.engineeringNotebookRubrics as rubric (rubric.id)}
										<button
											onclick={() => openNotebookRubric(team.id, rubric.id)}
											title={getJudgeName(rubric.judgeId)}
											class="flex h-8 shrink-0 items-center justify-center rounded-full bg-gray-100 px-3 text-sm whitespace-nowrap hover:bg-gray-200 active:bg-gray-300"
										>
											{rubricChipText(rubric)}
										</button>
									{/each}
								{:else}
									<div class="text-xs {notebookStatus.class} px-2 py-0.5">
										{notebookStatus.text}
									</div>
								{/if}
							</div>
							{@render newRubricButton(() => openNotebookRubric(team.id))}
						</div>

						<!-- Team Interview Rubrics Column -->
						<div class="flex max-w-74 min-w-74 items-center">
							<div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 p-1">
								{#each teamRubricsAndNotes.teamInterviewRubrics as rubric (rubric.id)}
									<button
										onclick={() => openTeamInterviewRubric(team.id, rubric.id)}
										title={getJudgeName(rubric.judgeId)}
										class="flex h-8 shrink-0 items-center justify-center rounded-full bg-gray-100 px-3 text-sm whitespace-nowrap hover:bg-gray-200 active:bg-gray-300"
									>
										{rubricChipText(rubric)}
									</button>
								{/each}
							</div>
							{@render newRubricButton(() => openTeamInterviewRubric(team.id))}
						</div>

						<!-- Team Photos Column -->
						<div class="flex max-w-20 min-w-20 items-center justify-center overflow-hidden p-1">
							<TeamPhotoAlbum teamId={team.id} compact={true} allowCapture={false} />
						</div>
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</teams-rubrics-table>
