<script lang="ts">
	import CompetitionSetupStep from './CompetitionSetupStep.svelte';
	import AwardSelectionStep from './AwardSelectionStep.svelte';
	import TeamImportStep from './TeamImportStep.svelte';
	import JudgeSetupStep from './JudgeSetupStep.svelte';
	import ReviewStep from './ReviewStep.svelte';
	import { onMount } from 'svelte';
	import { app, AppUI } from '$lib/app-page.svelte';
	import { AwardOptions, getOfficialAwardOptionsList, restoreAwardOptions } from '$lib/award.svelte';
	import { EditingJudgeGroup } from '$lib/judging.svelte';
	import { EditingTeam } from '$lib/team.svelte';
	import type { Program } from '@judging.jerryio/protocol/src/award';
	import type { EssentialData, EventGradeLevel } from '@judging.jerryio/protocol/src/event';
	import type { JudgingMethod, Judge, JudgingStep } from '@judging.jerryio/protocol/src/judging';
	import { getEventGradeLevelOptions } from '$lib/event.svelte';

	// Step management
	let currentStep = $state(0);
	const totalSteps = 5;

	let isEditingEventSetup = $state(false);

	// Event setup state
	let eventName: string = $state('My Event');
	let selectedProgram: Program = $state('V5RC');
	let selectedEventGradeLevel: EventGradeLevel = $state('Blended');

	// Award state - will be managed by the AwardSelectionStep
	let awardOptions: AwardOptions[] = $state([]);

	// Teams
	let teams: EditingTeam[] = $state([]);

	// Judging
	let judgingMethod: JudgingMethod = $state('assigned');
	let judgingStep: JudgingStep = $state('beginning');
	let judgeGroups: EditingJudgeGroup[] = $state([]);
	let judges: Judge[] = $state([]);
	let unassignedTeams: EditingTeam[] = $state([]);

	let originalJudges = app.getAllJudges();

	/**
	 * Load current data from app
	 */
	function loadCurrentData() {
		const eventSetup = app.getEssentialData();
		const allTeamData = app.getAllTeamData();
		const allJudges = app.getAllJudges();

		if (eventSetup) {
			isEditingEventSetup = true;
			// Load event info
			eventName = eventSetup.eventName;
			selectedProgram = eventSetup.program;
			selectedEventGradeLevel = eventSetup.eventGradeLevel;

			// Load awards
			const gradeOptions = getEventGradeLevelOptions(selectedProgram);
			const possibleGrades = gradeOptions.find((g) => g.value === selectedEventGradeLevel)?.grades ?? [];
			const officialAwardOptions = getOfficialAwardOptionsList(selectedProgram, possibleGrades);
			awardOptions = restoreAwardOptions(eventSetup.awards, officialAwardOptions, selectedProgram);

			// Load teams
			teams = eventSetup.teamInfos.map((teamWithData) => {
				const teamInfo = {
					id: teamWithData.id,
					number: teamWithData.number,
					name: teamWithData.name,
					city: teamWithData.city,
					state: teamWithData.state,
					country: teamWithData.country,
					shortName: teamWithData.shortName,
					school: teamWithData.school,
					grade: teamWithData.grade,
					group: teamWithData.group
				};
				const teamData = allTeamData[teamWithData.id] || {
					id: teamWithData.id,
					notebookLink: '',
					excluded: false
				};
				return new EditingTeam(teamInfo, teamData);
			});

			// Load judging setup
			const assignedTeams: EditingTeam[] = [];

			judgingMethod = eventSetup.judgingMethod;
			judgeGroups = eventSetup.judgeGroups.map((group) => {
				const judgeGroup = new EditingJudgeGroup(group.name);
				// Copy the properties instead of setting id directly
				Object.assign(judgeGroup, { id: group.id });
				judgeGroup.assignedTeams = group.assignedTeams.map((id) => teams.find((t) => t.id === id)!).filter(Boolean);
				assignedTeams.push(...judgeGroup.assignedTeams);
				return judgeGroup;
			});

			// Load judges
			judges = [...allJudges];

			// Update unassigned teams
			unassignedTeams = teams.filter((team) => !team.excluded && !assignedTeams.includes(team));
		}
	}

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function cancelSetup() {
		// Only allow cancel if user is in session
		if (app.isSessionJoined()) {
			AppUI.appPhase = 'workspace';
		}
	}

	function resetAwards() {
		awardOptions = [];
	}

	async function completeSetup() {
		try {
			// Create the event setup object
			const essentialData = {
				eventName,
				program: selectedProgram,
				eventGradeLevel: selectedEventGradeLevel,
				judgingMethod,
				judgingStep,
				teamInfos: teams.map((team) => ({ ...team.info, data: team.data })),
				judgeGroups: judgeGroups.map((group) => ({
					id: group.id,
					name: group.name,
					assignedTeams: group.assignedTeams.map((team) => team.id)
				})),
				awards: awardOptions.filter((award) => award.isSelected).map((award) => award.generateAward())
			} satisfies EssentialData;

			// Redirect based on whether user is judging ready
			if (app.isSessionJoined()) {
				await app.wrpcClient.essential.updateEssentialData.mutation(essentialData);
				await app.wrpcClient.team.updateAllTeamData.mutation(teams.map((team) => team.data));

				// Just in case: keep judges that are created during the event setup
				const currentJudges = app.getAllJudges();
				const newJudges = currentJudges
					.filter((judge) => !originalJudges.some((originalJudge) => originalJudge.id === judge.id))
					.filter((judge) => judgeGroups.some((group) => group.id === judge.groupId));

				await app.wrpcClient.judge.updateAllJudges.mutation([...newJudges, ...judges]);
				// User is already ready, go back to workspace
				AppUI.appPhase = 'workspace';
			} else {
				app.handleEssentialDataUpdate(essentialData);
				app.handleAllTeamDataUpdate(teams.map((team) => team.data));
				app.handleAllJudgesUpdate(judges);

				await app.createSession();
				// For Judge Advisor who created the session, auto-select role and show share dialog
				await app.selectUser({ role: 'judge_advisor' });

				AppUI.appPhase = 'workspace';
			}
		} catch (error) {
			console.error('Failed to complete setup:', error);
			// You might want to show an error message to the user here
			// TODO: This will be a major issue, ask the user to report the issue to the developer
		}
	}

	// Initialize component
	onMount(async () => {
		// Load current data from app
		loadCurrentData();

		currentStep = 1; // IMPORTANT: set to 1 after loading current data
	});
</script>

<div class="mx-auto max-w-6xl space-y-6 p-6">
	<!-- Step Indicator -->
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">Event Setup</h1>
		<div class="flex items-center">
			{#each Array(totalSteps) as _, i (i)}
				<div class="flex items-center">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors"
						class:bg-slate-900={i + 1 <= currentStep}
						class:text-white={i + 1 <= currentStep}
						class:bg-gray-200={i + 1 > currentStep}
						class:text-gray-500={i + 1 > currentStep}
					>
						{i + 1}
					</div>
					{#if i < totalSteps - 1}
						<div
							class="mx-2 h-0.5 w-12 transition-colors"
							class:bg-slate-900={i + 1 < currentStep}
							class:bg-gray-200={i + 1 >= currentStep}
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Step Content -->
	<div class="rounded-lg bg-white p-6 shadow-lg">
		{#if currentStep === 1}
			<CompetitionSetupStep
				bind:eventName
				bind:selectedProgram
				bind:selectedEventGradeLevel
				onResetAwards={resetAwards}
				onNext={nextStep}
				onCancel={cancelSetup}
				isSessionJoined={app.isSessionJoined()}
			/>
		{:else if currentStep === 2}
			<AwardSelectionStep
				{selectedProgram}
				{selectedEventGradeLevel}
				bind:allAwardOptions={awardOptions}
				onNext={nextStep}
				onPrev={prevStep}
			/>
		{:else if currentStep === 3}
			<TeamImportStep {isEditingEventSetup} bind:teams onNext={nextStep} onPrev={prevStep} />
		{:else if currentStep === 4}
			<JudgeSetupStep
				{isEditingEventSetup}
				{teams}
				bind:judgingMethod
				bind:judgeGroups
				bind:judges
				bind:unassignedTeams
				onNext={nextStep}
				onPrev={prevStep}
			/>
		{:else if currentStep === 5}
			<ReviewStep
				{selectedProgram}
				{selectedEventGradeLevel}
				{teams}
				{awardOptions}
				{judgingMethod}
				{judgeGroups}
				{judges}
				onPrev={prevStep}
				onComplete={completeSetup}
				onCancel={cancelSetup}
				isSessionJoined={app.isSessionJoined()}
			/>
		{/if}
	</div>
</div>
