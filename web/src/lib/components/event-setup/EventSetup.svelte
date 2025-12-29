<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import CompetitionSetupStep from './CompetitionSetupStep.svelte';
	import AwardSelectionStep from './AwardSelectionStep.svelte';
	import TeamGroupsStep from './TeamGroupsStep.svelte';
	import JudgeSetupStep from './JudgeSetupStep.svelte';
	import ReviewStep from './ReviewStep.svelte';
	import { onMount } from 'svelte';
	import { app, AppUI, gtag } from '$lib/index.svelte';
	import { AwardOptions, getOfficialAwardOptionsList, restoreAwardOptions } from '$lib/award.svelte';
	import { EditingJudgeGroup } from '$lib/judging.svelte';
	import { type TeamInfoAndData } from '$lib/team.svelte';
	import type { Program } from '@judgesroom.com/protocol/src/award';
	import type { EssentialData, EventGradeLevel } from '@judgesroom.com/protocol/src/event';
	import type { JudgingMethod, Judge, JudgingStep } from '@judgesroom.com/protocol/src/judging';
	import { getEventGradeLevelOptions } from '$lib/event.svelte';
	import EventCodeSetup from './EventCodeSetup.svelte';

	// Step management
	let currentStep = $state(0);
	const totalSteps = 6;

	let isEditingEventSetup = $state(false);

	// RobotEvents import state
	let robotEventsSku: string | null = $state(null);
	let robotEventsEventId: number | null = $state(null);
	let divisionId: number | null = $state(null);

	// Event setup state
	let eventName: string = $state('My Event');
	let selectedProgram: Program = $state('V5RC');
	let selectedEventGradeLevel: EventGradeLevel = $state('Blended');

	// Teams
	let teams: TeamInfoAndData[] = $state([]);

	// Judging
	let judgingMethod: JudgingMethod = $state('assigned');
	let judgingStep: JudgingStep = $state('beginning');
	let judgeGroups: EditingJudgeGroup[] = $state([]);
	let judges: Judge[] = $state([]);
	let unassignedTeams: TeamInfoAndData[] = $state([]);

	let originalJudges = app.getAllJudges();

	// Award state - will be managed by the AwardSelectionStep
	let awardOptions: AwardOptions[] = $state([]);

	/**
	 * Load current data from app
	 */
	function loadCurrentData() {
		const eventSetup = app.getEssentialData();
		const allTeamData = app.getAllTeamData();
		const allJudges = app.getAllJudges();

		if (eventSetup) {
			isEditingEventSetup = true;

			// Load RobotEvents import info
			robotEventsSku = eventSetup.robotEventsSku;
			robotEventsEventId = eventSetup.robotEventsEventId;
			divisionId = eventSetup.divisionId;

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
			teams = eventSetup.teamInfos.map((teamInfo) => {
				const teamData = allTeamData[teamInfo.id] || {
					id: teamInfo.id,
					notebookLink: '',
					hasInnovateAwardSubmissionForm: false,
					notebookDevelopmentStatus: 'undetermined' as const,
					absent: false
				};
				return { ...teamInfo, ...teamData } satisfies TeamInfoAndData;
			});

			// Load judging setup
			const assignedTeamIds = new Set<string>();

			judgingMethod = eventSetup.judgingMethod;
			judgingStep = eventSetup.judgingStep;
			judgeGroups = eventSetup.judgeGroups.map((group) => {
				const judgeGroup = new EditingJudgeGroup(group.name);
				// Copy the properties instead of setting id directly
				Object.assign(judgeGroup, { id: group.id });

				judgeGroup.assignedTeams = group.assignedTeams.map((id) => teams.find((t) => t.id === id) ?? null).filter((t) => t !== null);

				return judgeGroup;
			});

			// Load judges
			judges = [...allJudges];

			// Update unassigned teams
			unassignedTeams = teams.filter((team) => !assignedTeamIds.has(team.id));
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
		// Only allow cancel if user is in Judges' Room
		if (app.isJudgesRoomJoined()) {
			AppUI.appPhase = 'workspace';
		}
	}

	async function completeSetup() {
		try {
			// Create the event setup object
			const essentialData = {
				robotEventsSku,
				robotEventsEventId,
				divisionId,
				eventName,
				program: selectedProgram,
				eventGradeLevel: selectedEventGradeLevel,
				judgingMethod,
				judgingStep,
				teamInfos: teams.map((team) => ({
					id: team.id,
					number: team.number,
					name: team.name,
					city: team.city,
					state: team.state,
					country: team.country,
					shortName: team.shortName,
					school: team.school,
					grade: team.grade,
					group: team.group
				})),
				judgeGroups: judgeGroups.map((group) => ({
					id: group.id,
					name: group.name,
					assignedTeams: group.assignedTeams.map((team) => team.id)
				})),
				awards: awardOptions.filter((award) => award.isSelected).map((award) => award.generateAward())
			} satisfies EssentialData;

			// Redirect based on whether user is judging ready
			if (app.isJudgesRoomJoined()) {
				await app.wrpcClient.essential.updateEssentialData.mutation(essentialData);
				await app.wrpcClient.team.updateAllTeamData.mutation(
					teams.map((team) => ({
						id: team.id,
						notebookLink: team.notebookLink,
						hasInnovateAwardSubmissionForm: team.hasInnovateAwardSubmissionForm,
						notebookDevelopmentStatus: team.notebookDevelopmentStatus,
						absent: team.absent
					}))
				);

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
				app.handleAllTeamDataUpdate(
					teams.map((team) => ({
						id: team.id,
						notebookLink: team.notebookLink,
						hasInnovateAwardSubmissionForm: team.hasInnovateAwardSubmissionForm,
						notebookDevelopmentStatus: team.notebookDevelopmentStatus,
						absent: team.absent
					}))
				);
				app.handleAllJudgesUpdate(judges);

				await app.createJudgesRoom();
				// For Judge Advisor who created the Judges' Room, auto-select role and show share dialog
				await app.selectUser({ role: 'judge_advisor' });

				AppUI.appPhase = 'workspace';
			}

			gtag('event', 'event_setup_completed', {
				isEditingEventSetup,
				divisionId,
				awardCount: awardOptions.length,
				teamCount: teams.length,
				judgeGroupCount: judgeGroups.length,
				judgingMethod,
				isImportingFromRobotEvents: robotEventsSku && robotEventsEventId && divisionId
			});
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

<svelte:head>
	<title>{m.event_setup()} | Judges' Room</title>
</svelte:head>

<div class="h-full overflow-auto bg-slate-100 p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Step Indicator -->
		<div class="mb-4 md:mb-8">
			<!-- Mobile: Simple text indicator -->
			<div class="flex items-center justify-between md:hidden">
				<h1 class="text-xl font-bold text-gray-900">{m.event_setup()}</h1>
				<div class="text-sm font-medium text-gray-600">
					{m.step_of({ current: currentStep, total: totalSteps })}
				</div>
			</div>

			<!-- Desktop: Full visual indicator -->
			<div class="hidden items-center justify-between md:flex">
				<h1 class="text-3xl font-bold text-gray-900">{m.event_setup()}</h1>
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
		</div>

		<!-- Step Content -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			{#if currentStep === 1}
				<EventCodeSetup
					{isEditingEventSetup}
					bind:robotEventsSku
					bind:robotEventsEventId
					bind:divisionId
					bind:eventName
					bind:selectedProgram
					bind:selectedEventGradeLevel
					bind:teams
					bind:awardOptions
					onNext={nextStep}
					onCancel={cancelSetup}
				/>
			{:else if currentStep === 2}
				<CompetitionSetupStep
					{robotEventsEventId}
					bind:eventName
					bind:selectedProgram
					bind:selectedEventGradeLevel
					bind:teams
					bind:awardOptions
					onNext={nextStep}
					onPrev={prevStep}
				/>
			{:else if currentStep === 3}
				<TeamGroupsStep bind:teams onNext={nextStep} onPrev={prevStep} />
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
				<AwardSelectionStep
					{selectedProgram}
					{selectedEventGradeLevel}
					bind:allAwardOptions={awardOptions}
					onNext={nextStep}
					onPrev={prevStep}
				/>
			{:else if currentStep === 6}
				<ReviewStep onPrev={prevStep} onComplete={completeSetup} onCancel={cancelSetup} isJudgesRoomJoined={app.isJudgesRoomJoined()} />
			{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	:global {
		body {
			@apply bg-slate-100;
		}
	}
</style>
