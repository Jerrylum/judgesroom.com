<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import QRCode from 'qrcode';
	import './rubric.css';
	import { app, tabs, subscriptions, dialogs } from '$lib/index.svelte';
	import type { TeamInterviewRubricTab } from '$lib/tab.svelte';
	import { NotebookRubricTab } from '$lib/tab.svelte';
	import { generateUUID } from '$lib/utils.svelte';
	import { untrack } from 'svelte';
	import { sortByAssignedTeams, sortByTeamNumber } from '$lib/team.svelte';
	import WarningSign from './WarningSign.svelte';
	import AwardRankingTable from './AwardRankingTable.svelte';
	import TeamInterviewRubricTable from './TeamInterviewRubricTable.svelte';
	import RoleSelectionDialog from '../RoleSelectionDialog.svelte';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { getLocale } from '$lib/paraglide/runtime';

	interface Props {
		tab: TeamInterviewRubricTab;
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

	let judgeId = $state<string | null>(null);
	let rubricScores = $state<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let notes = $state('');
	let timestamp = $state(0);

	// Track initial state for unsaved changes detection
	let initialTeamId = $state('');
	let initialRubricScores = $state<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let initialNotes = $state('');

	let teamsSelectElement: HTMLSelectElement | null = $state(null);

	// Track unsaved changes
	$effect(() => {
		if (isSubmitted) {
			// No unsaved changes when submitted
			tab._isDataUnsaved = false;
		} else {
			// Check if any data has changed from initial state
			const hasChanges =
				tab.teamId !== initialTeamId || rubricScores.some((score, idx) => score !== initialRubricScores[idx]) || notes !== initialNotes;

			tab._isDataUnsaved = hasChanges;
		}
	});

	let qrCodeDataUrl = $state<string | null>(null);

	async function loadRubric() {
		if (!tab.rubricId) return;
		try {
			const existingRubric = await app.wrpcClient.judging.getTeamInterviewRubrics.query({ id: tab.rubricId });
			tab.teamId = existingRubric.teamId;
			judgeId = existingRubric.judgeId;
			rubricScores = existingRubric.rubric as number[];
			notes = existingRubric.notes;
			timestamp = existingRubric.timestamp;

			// Reset initial state to loaded values
			initialTeamId = existingRubric.teamId;
			initialRubricScores = [...(existingRubric.rubric as number[])];
			initialNotes = existingRubric.notes;
		} catch (error) {
			console.error('Failed to load existing rubric:', error);
			app.addErrorNotice(m.failed_to_load_existing_rubric());
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

	$effect(() => {
		if (tab.teamId) {
			(async () => {
				const notebookLink = includedTeams[tab.teamId].notebookLink;
				if (notebookLink === '') {
					qrCodeDataUrl = null;
					return;
				}
				qrCodeDataUrl = await QRCode.toDataURL(notebookLink, {
					margin: 2,
					color: {
						dark: '#000000',
						light: '#FFFFFF'
					},
					errorCorrectionLevel: 'M'
				});
			})();
		}
	});

	$effect(() => {
		if (!teamsSelectElement) return;
		// Update the select element to the current team id
		teamsSelectElement.value = tab.teamId;
	});

	$effect(() => {
		if (tab.teamId && !currentJudgeGroup?.assignedTeams.includes(tab.teamId)) {
			// If the user is editing a team that is not assigned to them, uncheck the "Only show assigned teams" checkbox
			// Such that the user can see all the teams in the event
			showOnlyAssignedTeams = false;
		}
	});

	function handleTeamSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		tab.teamId = target.value;
	}

	function handleShowOnlyAssignedTeamsChange(event: { currentTarget: EventTarget & HTMLInputElement }) {
		const newState = event.currentTarget.checked;

		if (newState && !currentJudgeGroup?.assignedTeams.includes(tab.teamId)) {
			// Clear the team selection if the user is checking the box and the team is not assigned to them
			tab.teamId = '';
		}
	}

	// Scroll container references for synchronization
	let mainScrollContainer: HTMLElement;

	// Get teams to display based on filter
	const teamsToShow = $derived.by(() => {
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup && !isSubmitted) {
			const rtn = sortByAssignedTeams(includedTeams, currentJudgeGroup.assignedTeams);
			console.log('rtn', rtn);
			return rtn;
		} else {
			const rtn = sortByTeamNumber(Object.values(includedTeams));
			console.log('rtn', rtn);
			return rtn;
		}
	});

	// Get notebook rubrics submitted by current judge for the selected team
	const notebookRubricsForTeam = $derived.by(() => {
		if (!tab.teamId || !currentJudge) return [];

		const submissionCaches = Object.values(subscriptions.allSubmissionCaches);
		return submissionCaches
			.filter((sub) => sub.teamId === tab.teamId && sub.enrId && sub.judgeId === currentJudge.id)
			.map((sub) => ({
				id: sub.enrId!,
				judgeId: sub.judgeId
			}));
	});

	function openNotebookRubric(rubricId: string) {
		const tab = new NotebookRubricTab({ rubricId });
		tabs.addOrReuseTab(tab);
	}

	async function saveRubric() {
		if (!tab.teamId) {
			app.addErrorNotice(m.please_select_a_team());
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
			app.addErrorNotice(m.please_complete_all_scoring_sections());
			return;
		}

		try {
			tab.rubricId = tab.rubricId || generateUUID();

			// Save the rubric via WRPC
			await app.wrpcClient.judging.completeTeamInterviewRubric.mutation({
				judgeGroupId: currentJudgeGroup.id,
				submission: {
					id: tab.rubricId,
					teamId: tab.teamId,
					judgeId,
					rubric: rubricScores,
					notes,
					timestamp: (timestamp = Date.now())
				}
			});

			isSubmitted = true;

			// Update initial state to current saved state
			initialTeamId = tab.teamId;
			initialRubricScores = [...rubricScores];
			initialNotes = notes;

			app.addSuccessNotice(m.team_interview_rubric_saved_successfully());
		} catch (error) {
			console.error('Failed to save team interview rubric:', error);
			app.addErrorNotice(m.failed_to_save_team_interview_rubric());
		}
	}

	function editRubric() {
		// Enable editing mode
		isSubmitted = false;
		showValidationErrors = false;

		// Scroll to top
		mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function closeRubric() {
		tabs.closeTab(tab.id);
	}

	function newRubric() {
		// Reset all form data
		tab.teamId = '';
		tab.rubricId = null;
		judgeId = currentJudge?.id ?? null;
		rubricScores = [-1, -1, -1, -1, -1, -1, -1, -1, -1];
		notes = '';
		showValidationErrors = false;
		isSubmitted = false;

		// Reset initial state to empty
		initialTeamId = '';
		initialRubricScores = [-1, -1, -1, -1, -1, -1, -1, -1, -1];
		initialNotes = '';

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
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-900">{m.team_interview_rubric()}</h2>
				{#if isSubmitted}
					<button onclick={editRubric} class="secondary tiny">{m.edit()}</button>
				{/if}
			</div>

			<div class="mb-4">
				{#if isSubmitted && tab.teamId}
					<div class="mb-2 mt-1 text-base text-gray-900">
						<strong>{m.team_hash()}</strong>: {includedTeams[tab.teamId].number}
					</div>
				{:else}
					<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700"><strong>{m.team_hash()}</strong></label>
					<select id="team-select" bind:this={teamsSelectElement} class="classic mb-2 mt-1 block w-full" onchange={handleTeamSelectChange}>
						<option value="">{m.select_a_team()}</option>
						{#each teamsToShow as team (team.id)}
							<option value={team.id} selected={team.id === tab.teamId}>{team.number} - {team.name}</option>
						{/each}
					</select>
				{/if}

				<!-- Filter Controls -->
				{#if isAssignedJudging && !isSubmitted && currentJudgeGroup}
					<div class="mb-4">
						<label class="flex items-center">
							<input
								type="checkbox"
								bind:checked={showOnlyAssignedTeams}
								class="mr-2 rounded border-gray-300"
								onchange={handleShowOnlyAssignedTeamsChange}
							/>
							<span class="text-sm text-gray-700">
								{m.only_show_assigned_teams_for_your_current_judge_group({ name: currentJudgeGroup.name })}
							</span>
						</label>
					</div>
				{/if}
			</div>

			{#if tab.teamId}
				{@const selectedTeam = includedTeams[tab.teamId]}
				{@const notebookLink = selectedTeam.notebookLink || '(Not provided)'}
				{@const devStatus = selectedTeam.notebookDevelopmentStatus}
				{@const devStatusText =
					devStatus === 'fully_developed' ? 'Fully Developed' : devStatus === 'developing' ? 'Developing' : 'Not Submitted/Not Reviewed'}
				<div class="mb-4 flex flex-row justify-between gap-2 rounded-lg bg-gray-50 p-4">
					<div class=" text-sm text-gray-800">
						<p><strong>{m.team_hash()}{selectedTeam.number}:</strong> {selectedTeam.name}</p>
						<p><strong>{m.school_colon()}</strong>{selectedTeam.school}</p>
						<p><strong>{m.grade_level_colon()}</strong>{selectedTeam.grade}</p>
						<p>
							{#if notebookLink === '(Not provided)'}
								<strong>{m.notebook_link_colon()}</strong>{notebookLink}
							{:else}
								<strong>{m.notebook_link_colon()}</strong><a class="text-blue-500 hover:text-blue-600" href={notebookLink} target="_blank"
									>{notebookLink}</a
								>
							{/if}
						</p>
						<p>
							<strong>{m.notebook_development_status_colon()}</strong><span
								class:text-green-600={devStatus === 'fully_developed'}
								class:text-yellow-600={devStatus === 'developing'}
								class:text-gray-600={devStatus === 'undetermined'}
							>
								{devStatusText}
							</span>
						</p>
						{#if notebookRubricsForTeam.length > 0}
							<p>
								<strong>{m.your_notebook_rubrics_colon()}</strong>{#each notebookRubricsForTeam as rubric, index}
									<button onclick={() => openNotebookRubric(rubric.id)} class="text-blue-500 hover:text-blue-600">
										Rubric {index + 1}
									</button>{index < notebookRubricsForTeam.length - 1 ? ', ' : ''}
								{/each}
							</p>
						{/if}
					</div>

					{#if qrCodeDataUrl}
						<img src={qrCodeDataUrl} alt="QR Code for engineering notebook" class="h-48 w-48 rounded max-sm:hidden" />
					{/if}
				</div>

				{#if selectedTeam.absent}
					<WarningSign title={m.absent_team()}>
						<p>{m.absent_team_description()}</p>
					</WarningSign>
				{/if}
			{/if}

			<!-- Current Judge Information (Read-only) -->
			<div class="mt-2 text-sm text-gray-700">
				{#if judgeId}
					<p><strong>{m.judge_name_colon()}</strong>{app.findJudgeById(judgeId)?.name}</p>
				{:else}
					<p>
						{m.please_switch_to_a_judge()}{' '}<button onclick={switchToJudge} class="text-blue-500 hover:text-blue-600"
							>{m.switch_to_judge()}</button
						>
					</p>
				{/if}
				<!-- Submission Timestamp -->
				{#if tab.rubricId}
					<div class="text-sm text-gray-700">
						<p><strong>{m.submitted_at_colon()}</strong>{new Date(timestamp).toLocaleString(getLocale())}</p>
					</div>
				{/if}
			</div>
		</div>
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<p class="mb-6 text-sm text-gray-600">
				{@html sanitizeHTMLMessage(m.team_interview_rubric_directions)}
			</p>

			<TeamInterviewRubricTable bind:rubricScores bind:notes {isSubmitted} {showValidationErrors} />

			<p class="mt-2 text-center text-xs italic">
				{m.judging_materials_strictly_confidential_description()}
			</p>

			<div class="mt-6 flex justify-center gap-4">
				{#if isSubmitted}
					<button onclick={editRubric} class="secondary">{m.edit_rubric()}</button>
					<button onclick={closeRubric} class="secondary">{m.close_rubric()}</button>
					<button onclick={newRubric} class="primary">{m.new_rubric()}</button>
				{:else}
					<button onclick={saveRubric} class="primary" disabled={!judgeId}>{m.submit_rubric()}</button>
				{/if}
			</div>
		</div>

		<!-- Award Rankings Section -->
		{#if tab.teamId && currentJudgeGroup && subscriptions.allJudgeGroupsAwardRankings[currentJudgeGroup.id]}
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">{m.award_candidate_ranking()}</h3>
				<p class="mb-4 text-sm text-gray-600">
					{m.rubric_award_candidate_ranking_description()}
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
