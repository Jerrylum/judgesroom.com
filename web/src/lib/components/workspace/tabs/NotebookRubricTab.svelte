<script lang="ts">
	import './rubric.css';
	import { app, tabs, subscriptions, dialogs } from '$lib/app-page.svelte';
	import type { NotebookRubricTab } from '$lib/tab.svelte';
	import { generateUUID } from '$lib/utils.svelte';
	import { untrack } from 'svelte';
	import { sortByAssignedTeams, sortByNotebookDevelopmentStatus, sortByTeamNumber } from '$lib/team.svelte';
	import WarningSign from './WarningSign.svelte';
	import AwardRankingTable from './AwardRankingTable.svelte';
	import NotebookRubricTable from './NotebookRubricTable.svelte';
	import RoleSelectionDialog from '../RoleSelectionDialog.svelte';

	interface Props {
		tab: NotebookRubricTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const includedTeams = $derived(app.getAllTeamInfoAndData());
	const essentialData = $derived(app.getEssentialData());
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');
	const currentJudge = $derived(app.getCurrentUserJudge());
	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());

	// State for showing only assigned teams
	let showOnlyAssignedTeams = $state(true);

	let showValidationErrors = $state(false);
	let isSubmitted = $state(tab.rubricId !== null);

	let judgeId = $state<string | null>(null); // Store judge ID for existing rubrics
	let rubricScores = $state<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let notes = $state('');
	let innovateAwardNotes = $state('');
	let timestamp = $state(0);

	async function loadRubric() {
		if (!tab.rubricId) return;
		try {
			const existingRubric = await app.wrpcClient.judging.getEngineeringNotebookRubrics.query({ id: tab.rubricId! });
			tab.teamId = existingRubric.teamId;
			judgeId = existingRubric.judgeId;
			rubricScores = existingRubric.rubric as number[];
			notes = existingRubric.notes;
			innovateAwardNotes = existingRubric.innovateAwardNotes;
			timestamp = existingRubric.timestamp;
		} catch (error) {
			console.error('Failed to load existing rubric:', error);
			app.addErrorNotice('Failed to load existing rubric');
		}
	}

	// Load existing rubric data if rubricId is provided
	$effect(() => {
		untrack(loadRubric);
	});

	$effect(() => {
		if (!isSubmitted) {
			judgeId = currentJudge?.id ?? null;
		}
	});

	// Scroll container references for synchronization
	let mainScrollContainer: HTMLElement;

	const teamsToShow = $derived(() => {
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup && !isSubmitted) {
			return sortByAssignedTeams(includedTeams, currentJudgeGroup.assignedTeams);
		} else {
			return sortByNotebookDevelopmentStatus(sortByTeamNumber(Object.values(includedTeams)));
		}
	});

	async function saveRubric() {
		if (!tab.teamId) {
			app.addErrorNotice('Please select a team');
			// Scroll to top to help user select team
			mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}

		if (!judgeId || !currentJudgeGroup) {
			app.addErrorNotice('CRITICAL: Please switch to a judge');
			return;
		}

		// Check if all scores are provided
		const missingScores = rubricScores.some((score) => score === -1);
		if (missingScores) {
			showValidationErrors = true;
			app.addErrorNotice('Please complete all scoring sections before submitting the rubric.');
			return;
		}

		try {
			const selectedTeam = includedTeams[tab.teamId];
			// If the notebook is developing or not reviewed, mark it as fully developed
			if (selectedTeam.notebookDevelopmentStatus !== 'fully_developed') {
				await app.wrpcClient.team.updateTeamData.mutation({
					...selectedTeam,
					notebookDevelopmentStatus: 'fully_developed'
				});
			}

			tab.rubricId = tab.rubricId || generateUUID();

			// Save the rubric via WRPC
			await app.wrpcClient.judging.completeEngineeringNotebookRubric.mutation({
				judgeGroupId: currentJudgeGroup.id,
				submission: {
					id: tab.rubricId,
					teamId: tab.teamId,
					judgeId,
					rubric: rubricScores,
					notes,
					innovateAwardNotes,
					timestamp: (timestamp = Date.now())
				}
			});

			isSubmitted = true;
			app.addSuccessNotice('Notebook rubric saved successfully!');
		} catch (error) {
			console.error('Failed to save notebook rubric:', error);
			app.addErrorNotice('Failed to save notebook rubric');
		}
	}

	function closeRubric() {
		tabs.closeTab(tab.id);
	}

	function editRubric() {
		// Enable editing mode
		isSubmitted = false;
		showValidationErrors = false;

		// Scroll to top
		mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function newRubric() {
		// Reset all form data
		tab.teamId = '';
		tab.rubricId = null;
		judgeId = null;
		rubricScores = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
		notes = '';
		innovateAwardNotes = '';
		showValidationErrors = false;
		isSubmitted = false;

		// Scroll to top
		mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function switchToJudge() {
		dialogs.showCustom(RoleSelectionDialog, { props: {} });
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6" bind:this={mainScrollContainer}>
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->

		<div class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Notebook Review</h2>

			<div class="mb-4">
				<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700"><strong>Team #</strong></label>
				<select id="team-select" bind:value={tab.teamId} class="classic mb-2 mt-1 block w-full" disabled={isSubmitted}>
					<option value="">Select a team...</option>
					{#each teamsToShow() as team (team.id)}
						{@const devStatus = team.notebookDevelopmentStatus ?? null}
						{@const statusText = devStatus === 'fully_developed' ? ' (Fully Developed)' : devStatus === 'developing' ? ' (Developing)' : ''}
						<option value={team.id}>{team.number}{statusText}</option>
					{/each}
				</select>

				<!-- Filter Controls -->
				{#if isAssignedJudging && !isSubmitted && currentJudgeGroup}
					<div class="mb-4">
						<label class="flex items-center">
							<input type="checkbox" bind:checked={showOnlyAssignedTeams} class="mr-2 rounded border-gray-300" />
							<span class="text-sm text-gray-700">
								Only show assigned teams for your current judge group ({currentJudgeGroup.name})
							</span>
						</label>
					</div>
				{/if}
			</div>

			{#if tab.teamId}
				{@const selectedTeam = includedTeams[tab.teamId]}
				{@const notebookLink = selectedTeam.notebookLink || '(Not provided)'}
				{@const devStatus = selectedTeam.notebookDevelopmentStatus}
				<div class="mb-4 rounded-lg bg-gray-50 p-4">
					<div class=" text-sm text-gray-800">
						<p><strong>Team #{selectedTeam.number}:</strong> {selectedTeam.name}</p>
						<p><strong>School:</strong> {selectedTeam.school}</p>
						<p><strong>Grade Level:</strong> {selectedTeam.grade}</p>
						<p>
							<strong>Notebook Link:</strong>
							{#if notebookLink === '(Not provided)'}
								{notebookLink}
							{:else}
								<a class="text-blue-500 hover:text-blue-600" href={notebookLink} target="_blank">{notebookLink}</a>
							{/if}
						</p>
					</div>
				</div>

				{#if devStatus !== 'fully_developed'}
					<WarningSign title="Developing Notebook">
						<p>
							Only <strong>Fully Developed</strong> notebooks will be completed the Engineering Notebook Rubric. This notebook will be
							marked as <strong>Fully Developed</strong> if the rubric is submitted.
						</p>
					</WarningSign>
				{/if}
				{#if selectedTeam.excluded}
					<WarningSign title="Excluded Team">
						<p>This team has been marked as excluded. They are not eligible for any Judged Awards.</p>
					</WarningSign>
				{/if}
			{/if}

			<div class="mt-2 text-sm text-gray-700">
				{#if judgeId}
					<p><strong>Judge Name:{' '}</strong>{app.findJudgeById(judgeId)?.name}</p>
				{:else}
					<p>
						(Please switch to a judge in order to submit the rubric){' '}<button
							onclick={switchToJudge}
							class="text-blue-500 hover:text-blue-600">Switch to Judge</button
						>
					</p>
				{/if}
				<!-- Submission Timestamp -->
				{#if tab.rubricId}
					<div class="text-sm text-gray-700">
						<p><strong>Submitted at:</strong> {new Date(timestamp).toLocaleString('en-us')}</p>
					</div>
				{/if}
			</div>
		</div>
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<p class="mb-2 text-sm text-gray-600">
				<strong>Directions:</strong> Determine the point value that best characterizes the content of the Engineering Notebook for that criterion.
				Write that value in the column to the right. This rubric is to be used for all Engineering Notebooks regardless of format (physical or
				digital). Please refer to Section 5 of the Guide to Judging for information on how to use this rubric.
			</p>
			<p class="mb-6 text-sm text-gray-600">
				<strong>Notes:</strong> Any student-centered or academic honesty concerns, such as plagiarism, should be brought to the attention of
				the Judge Advisor and/or Event Partner.
			</p>

			<NotebookRubricTable bind:rubricScores bind:notes bind:innovateAwardNotes {isSubmitted} {showValidationErrors} />

			<p class="mt-2 text-center text-xs italic">
				All judging materials are strictly confidential. They are not shared beyond the Judges and Judge Advisor and shall be destroyed at
				the end of the event.
			</p>

			<div class="mt-6 flex justify-center gap-4">
				{#if isSubmitted}
					<button onclick={editRubric} class="secondary">Edit Rubric</button>
					<button onclick={closeRubric} class="secondary">Close Rubric</button>
					<button onclick={newRubric} class="primary">New Rubric</button>
				{:else}
					<button onclick={saveRubric} class="primary" disabled={!judgeId}>Submit Rubric</button>
				{/if}
			</div>
		</div>

		<!-- Award Rankings Section -->
		{#if tab.teamId && currentJudgeGroup && subscriptions.allJudgeGroupsAwardRankings[currentJudgeGroup.id]}
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Award Candidate Ranking</h3>
				<p class="mb-4 text-sm text-gray-600">
					Rate this team for specific awards based on your notebook review by clicking on the boxes below. Indicate how strong a candidate
					this team is for each award using the star system (0-5 stars). This table is shared and synchronized within your judge group - all
					judges see updates in real-time without having to refresh the page.
				</p>
				<AwardRankingTable
					title=""
					judgeGroup={currentJudgeGroup}
					showingTeams={{ targetTeams: [tab.teamId] }}
					bypassAwardRequirements={false}
				/>
			</div>
		{/if}
	</div>
</div>
