<script lang="ts">
	import {
		type AwardOptions,
		getOfficialAwardOptionsList,
		type CompetitionType
	} from '$lib/awards.svelte';
	import { type EventGradeLevel, getEventGradeLevelOptions } from '$lib/event.svelte';
	import { Team } from '$lib/teams.svelte';
	import { type JudgingMethod, JudgeGroupClass, type Judge } from '$lib/judging.svelte';
	import CompetitionSetupStep from './CompetitionSetupStep.svelte';
	import AwardSelectionStep from './AwardSelectionStep.svelte';
	import TeamImportStep from './TeamImportStep.svelte';
	import JudgeSetupStep from './JudgeSetupStep.svelte';
	import ReviewStep from './ReviewStep.svelte';
	import { untrack, onMount, onDestroy } from 'svelte';
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';

	// Extended AwardOptions type for drag and drop
	type AwardOptionsWithId = AwardOptions & { id: string };

	// Step management
	let currentStep = $state(1);
	const totalSteps = 5;

	// Event setup state
	let eventName: string = $state('My Event');
	let selectedCompetitionType: CompetitionType = $state('V5RC');
	let selectedEventGradeLevel: EventGradeLevel = $state('Blended');

	// Award state - will be managed by the AwardSelectionStep
	let performanceAwards: AwardOptionsWithId[] = $state([]);
	let judgedAwards: AwardOptionsWithId[] = $state([]);
	let volunteerNominatedAwards: AwardOptionsWithId[] = $state([]);

	// Teams
	let teams: Team[] = $state([]);

	// Judging
	let judgingMethod: JudgingMethod = $state('assigned');
	let judgeGroups: JudgeGroupClass[] = $state([]);
	let judges: Judge[] = $state([]);
	let unassignedTeams: Team[] = $state([]);

	// Get current grades based on selection - this is computed in CompetitionSetupStep now
	const gradeOptions = $derived(getEventGradeLevelOptions(selectedCompetitionType));
	const possibleGrades = $derived(
		gradeOptions.find((g) => g.value === selectedEventGradeLevel)?.grades ?? []
	);

	// Hash comparison for conflict detection
	let originalEventSetupHash: string | null = null;

	// Current app data for comparison
	const currentAppEventSetup = $derived(app.getEventSetup());

	/**
	 * Generate SHA-256 hash of event setup data
	 */
	async function generateEventSetupHash(eventSetup: any): Promise<string | null> {
		if (!eventSetup) return null;

		const stableString = JSON.stringify(eventSetup, Object.keys(eventSetup).sort());
		const encoder = new TextEncoder();
		const data = encoder.encode(stableString);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Check if current event setup conflicts with original
	 */
	async function hasEventSetupConflict(): Promise<boolean> {
		if (!originalEventSetupHash || !currentAppEventSetup) return false;
		const currentHash = await generateEventSetupHash(currentAppEventSetup);
		return currentHash !== originalEventSetupHash;
	}

	/**
	 * Load current data from app
	 */
	function loadCurrentData() {
		const eventSetup = currentAppEventSetup;
		const allJudges = app.getAllJudges();

		if (eventSetup) {
			// Load event info
			eventName = eventSetup.eventName;
			selectedCompetitionType = eventSetup.competitionType;
			selectedEventGradeLevel = eventSetup.eventGradeLevel;

			// Load teams
			const allTeamData = app.getAllTeamData();
			teams = eventSetup.teams.map((teamInfo) => {
				const teamData = allTeamData[teamInfo.number] || { notebookLink: '', excluded: false };
				return new Team(teamInfo, teamData);
			});

			// Load judging setup
			judgingMethod = eventSetup.judgingMethod;
			judgeGroups = eventSetup.judgeGroups.map((group) => {
				const judgeGroup = new JudgeGroupClass(group.name);
				// Copy the properties instead of setting id directly
				Object.assign(judgeGroup, { id: group.id });
				judgeGroup.assignedTeams = group.assignedTeams
					.map((teamNumber) => teams.find((t) => t.number === teamNumber)!)
					.filter(Boolean);
				return judgeGroup;
			});

			// Load judges
			judges = [...allJudges];

			// Update unassigned teams
			const assignedTeamNumbers = new Set(
				judgeGroups.flatMap((group) => group.assignedTeams.map((team) => team.number))
			);
			unassignedTeams = teams.filter(
				(team) => !team.excluded && !assignedTeamNumbers.has(team.number)
			);
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
		if (app.isInSession()) {
			AppUI.appPhase = 'workspace';
		}
	}

	async function completeSetup() {
		try {
			// Check for event setup conflicts before saving
			const hasConflict = await hasEventSetupConflict();
			if (hasConflict) {
				const confirmed = await dialogs.showConfirmation({
					title: 'Event Setup Modified',
					message:
						'The event setup has been modified on another device while you were editing. Do you want to continue and overwrite those changes?',
					confirmText: 'Continue',
					cancelText: 'Cancel',
					confirmButtonClass: 'danger'
				});

				if (!confirmed) {
					return;
				}
			}

			// Create the event setup object
			const eventSetup = {
				eventName,
				competitionType: selectedCompetitionType,
				eventGradeLevel: selectedEventGradeLevel,
				performanceAwards: performanceAwards
					.filter((award) => award.isSelected)
					.map((award) => ({
						...award.generateAward(),
						type: 'performance' as const
					})),
				judgedAwards: judgedAwards
					.filter((award) => award.isSelected)
					.map((award) => ({
						...award.generateAward(),
						type: 'judged' as const
					})),
				volunteerNominatedAwards: volunteerNominatedAwards
					.filter((award) => award.isSelected)
					.map((award) => ({
						...award.generateAward(),
						type: 'volunteer_nominated' as const
					})),
				teams: teams.map((team) => team.info),
				judgingMethod,
				judgeGroups: judgeGroups.map((group) => ({
					id: group.id,
					name: group.name,
					assignedTeams: group.assignedTeams.map((team) => team.number)
				}))
			};

			// Save to app if available
			await app.updateEventSetup(eventSetup);

			// Also save team data (notebookLink, excluded status, etc.)
			for (const team of teams) {
				await app.updateTeamData(team.number, team.data);
			}

			// Also save judges
			for (const judge of judges) {
				await app.updateJudge(judge);
			}

			// Redirect based on whether user is in session
			if (app.isInSession()) {
				// User is already in session, go back to workspace
				AppUI.appPhase = 'workspace';
			} else {
				// User is not in session, continue to session setup
				AppUI.appPhase = 'session_setup';
			}
		} catch (error) {
			console.error('Failed to complete setup:', error);
			// You might want to show an error message to the user here
			// TODO: This will be a major issue, ask the user to report the issue to the developer
		}
	}

	// Reset grade level when competition type changes
	$effect(() => {
		if (gradeOptions.length > 0) {
			selectedEventGradeLevel = gradeOptions[gradeOptions.length - 1].value;
		}
	});

	// Initialize component
	onMount(async () => {
		// Load current data from app
		loadCurrentData();

		// Store original hash for conflict detection
		const eventSetup = currentAppEventSetup;
		if (eventSetup) {
			originalEventSetupHash = await generateEventSetupHash(eventSetup);
		}
	});

	// Clear hash on unmount
	onDestroy(() => {
		originalEventSetupHash = null;
	});

	// Monitor app data changes and warn about conflicts
	$effect(() => {
		if (originalEventSetupHash && currentAppEventSetup) {
			(async () => {
				const currentHash = await generateEventSetupHash(currentAppEventSetup);
				if (currentHash && currentHash !== originalEventSetupHash) {
					app.addErrorNotice(
						'Event setup has been modified on another device. Your changes may conflict.'
					);
				}
			})();
		}
	});

	// Load official awards when competition type or grade changes
	$effect(() => {
		if (selectedCompetitionType && possibleGrades.length > 0) {
			const officialAwards = getOfficialAwardOptionsList(selectedCompetitionType, possibleGrades);

			// Separate awards by type
			performanceAwards = officialAwards
				.filter((award) => award.possibleTypes.includes('performance'))
				.map((award, index) => Object.assign(award, { id: `performance-${index}` }));

			judgedAwards = officialAwards
				.filter((award) => award.possibleTypes.includes('judged'))
				.map((award, index) => Object.assign(award, { id: `judged-${index}` }));

			volunteerNominatedAwards = officialAwards
				.filter(
					(award) =>
						!award.possibleTypes.includes('performance') && !award.possibleTypes.includes('judged')
				)
				.map((award, index) => Object.assign(award, { id: `vol-${index}` }));
		}
	});

	$effect(() => {
		if (teams.length > 0) {
			unassignedTeams = teams.filter((team) => !team.excluded);
			untrack(() => {
				judgeGroups.forEach((group) => {
					group.assignedTeams = [];
				});
			});
		}
	});
</script>

<div class="mx-auto max-w-6xl space-y-6 p-6">
	<!-- Step Indicator -->
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-900">Event Setup</h1>
		<div class="flex items-center space-x-4">
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
				bind:selectedCompetitionType
				bind:selectedEventGradeLevel
				onNext={nextStep}
			/>
		{:else if currentStep === 2}
			<AwardSelectionStep
				{selectedCompetitionType}
				{possibleGrades}
				bind:performanceAwards
				bind:judgedAwards
				bind:volunteerNominatedAwards
				onNext={nextStep}
				onPrev={prevStep}
			/>
		{:else if currentStep === 3}
			<TeamImportStep bind:teams onNext={nextStep} onPrev={prevStep} />
		{:else if currentStep === 4}
			<JudgeSetupStep
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
				{selectedCompetitionType}
				{selectedEventGradeLevel}
				{teams}
				{performanceAwards}
				{judgedAwards}
				{volunteerNominatedAwards}
				{judgingMethod}
				{judgeGroups}
				{judges}
				onPrev={prevStep}
				onComplete={completeSetup}
				onCancel={cancelSetup}
				isInSession={app.isInSession()}
			/>
		{/if}
	</div>
</div>
