<script lang="ts">
	import { app, subscriptions, tabs } from '$lib/app-page.svelte';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';
	import { NotebookRubricTab, TeamInterviewRubricTab } from '$lib/tab.svelte';
	import { sortByTeamNumber, type TeamInfoAndData } from '$lib/team.svelte';
	import { mergeArrays } from '$lib/utils.svelte';
	import type { Submission } from '@judging.jerryio/protocol/src/rubric';

	type RubricsAndNotes = Awaited<ReturnType<typeof app.wrpcClient.judging.getRubricsAndNotes.query>>;

	const teams = $derived(app.getAllTeamInfoAndData());

	interface RubricsAndNotesPerTeam {
		engineeringNotebookRubrics: Submission[];
		teamInterviewRubrics: Submission[];
		teamInterviewNotes: Submission[];
	}

	let rubricsAndNotes = $state<RubricsAndNotes>([]);
	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');
	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());
	let showOnlyAssignedTeams = $state(true); // Default to true as requested

	const teamList = $derived.by(() => {
		let teamIdsInOrder: string[] = [];
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup) {
			const assignedTeams = currentJudgeGroup.assignedTeams;
			const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[currentJudgeGroup.id] ?? [];
			teamIdsInOrder = mergeArrays(assignedTeams, reviewedTeams);
		} else {
			teamIdsInOrder = sortByTeamNumber(Object.values(includedTeams)).map((team) => team.id);
		}
		return teamIdsInOrder;
	});

	const data = $derived.by(() => {
		const rtn: Record<string, RubricsAndNotesPerTeam> = {};

		for (const rubric of rubricsAndNotes) {
			const target = rtn[rubric.teamId] || {
				engineeringNotebookRubrics: [],
				teamInterviewRubrics: [],
				teamInterviewNotes: []
			};
			if (rubric.enrId) {
				target.engineeringNotebookRubrics.push({
					id: rubric.enrId,
					judgeId: rubric.judgeId
				});
			}
			if (rubric.tiId) {
				target.teamInterviewRubrics.push({
					id: rubric.tiId,
					judgeId: rubric.judgeId
				});
			}
			if (rubric.tnId) {
				target.teamInterviewNotes.push({
					id: rubric.tnId,
					judgeId: rubric.judgeId
				});
			}
			rtn[rubric.teamId] = target;
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
	function getNotebookStatus(isDevelopedNotebook: boolean | null | undefined) {
		if (isDevelopedNotebook === true) return { text: 'Fully Developed', class: 'text-green-600' };
		if (isDevelopedNotebook === false) return { text: 'Developing', class: 'text-yellow-600' };
		return { text: 'Not Reviewed', class: 'text-gray-600' };
	}

	// Get judge name by ID
	function getJudgeName(judgeId: string): string {
		return app.findJudgeById(judgeId)?.name ?? 'Unknown Judge';
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

	async function refreshRubricsAndNotes() {
		const judgeGroupId = app.getCurrentUserJudgeGroup()?.id;
		try {
			rubricsAndNotes = await app.wrpcClient.judging.getRubricsAndNotes.query({ judgeGroupId });
		} catch (error) {
			console.error('Failed to load rubrics data:', error);
			app.addErrorNotice('Failed to load rubrics data');
		}
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="text-lg font-medium text-gray-900">Teams & Rubrics ({teamList.length} teams)</h2>
	<button
		onclick={refreshRubricsAndNotes}
		class="inline-flex items-center space-x-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
		aria-label="Refresh teams and rubrics"
	>
		<RefreshIcon />
		<span>Refresh</span>
	</button>
</div>

{#if isAssignedJudging && currentJudgeGroup}
	<div class="mb-4">
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showOnlyAssignedTeams}
				class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Only show assigned teams for your current judge group ({currentJudgeGroup.name})</span>
		</label>
	</div>
{/if}

<div class="space-y-4">
	{#each teamList as teamId (teamId)}
		{@const team = teams[teamId]}
		{@const teamRubricsAndNotes = data[teamId] ?? getEmptyRubricsAndNotesPerTeam()}
		{@const notebookStatus = getNotebookStatus(team.isDevelopedNotebook)}
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
					{#if team.notebookLink && team.notebookLink.trim() !== ''}
						<a href={team.notebookLink} target="_blank" class="text-sm text-blue-600 underline hover:text-blue-800"> View Notebook </a>
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
						{#each teamRubricsAndNotes.engineeringNotebookRubrics as rubric}
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
						{#each teamRubricsAndNotes.teamInterviewRubrics as rubric}
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
			{#if teamRubricsAndNotes.teamInterviewNotes.length > 0}
				<div class="mt-3 rounded-lg bg-blue-50 p-3">
					<h4 class="mb-2 font-medium text-gray-900">Team Interview Notes</h4>
					<div class="space-y-1">
						{#each teamRubricsAndNotes.teamInterviewNotes as note}
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
