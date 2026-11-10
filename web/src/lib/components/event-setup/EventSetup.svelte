<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import CompetitionSetupStep from './CompetitionSetupStep.svelte';
	import AwardSelectionStep from './AwardSelectionStep.svelte';
	import TeamGroupsStep from './TeamGroupsStep.svelte';
	import JudgeSetupStep from './JudgeSetupStep.svelte';
	import ReviewStep from './ReviewStep.svelte';
	import { onMount, untrack } from 'svelte';
	import { app, AppUI, dialogs, gtag } from '$lib/index.svelte';
	import { AwardOptions, getOfficialAwardOptionsList, restoreAwardOptions } from '$lib/award.svelte';
	import { EditingJudgeGroup, isJudgeSetupReady } from '$lib/judging.svelte';
	import { type TeamInfoAndData } from '$lib/team.svelte';
	import type { Program } from '@judgesroom.com/protocol/src/award';
	import type { EssentialData, EventGradeLevel } from '@judgesroom.com/protocol/src/event';
	import { LATEST_JUDGE_GUIDE_VERSION, type JudgeGuideVersion } from '@judgesroom.com/protocol/src/judge-guide';
	import type { JudgingMethod, Judge, JudgingStep } from '@judgesroom.com/protocol/src/judging';
	import { getEventGradeLevelOptions, isCompetitionSetupReady } from '$lib/event.svelte';
	import EventCodeSetup from './EventCodeSetup.svelte';
	import AccessLinkVerifyDialog from '$lib/components/access/AccessLinkVerifyDialog.svelte';

	// Step management
	let currentStep = $state(0);
	const totalSteps = 6;

	let isEditingEventSetup = $state(false);
	let loaded = $state(false);
	let accessControlEnabled = $state(false);
	let wasAccessControlEnabled = $state(false);

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
	let judgeGuideVersion: JudgeGuideVersion = $state(LATEST_JUDGE_GUIDE_VERSION);
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
			judgingMethod = eventSetup.judgingMethod;
			judgingStep = eventSetup.judgingStep;
			judgeGuideVersion = eventSetup.judgeGuideVersion;
			accessControlEnabled = eventSetup.accessControlEnabled;
			wasAccessControlEnabled = eventSetup.accessControlEnabled;
			judgeGroups = eventSetup.judgeGroups.map((group) => {
				const judgeGroup = new EditingJudgeGroup(group.name);
				// Copy the properties instead of setting id directly
				Object.assign(judgeGroup, { id: group.id });

				judgeGroup.assignedTeams = group.assignedTeams.map((id) => teams.find((t) => t.id === id) ?? null).filter((t) => t !== null);

				return judgeGroup;
			});

			// Load judges
			judges = [...allJudges];

			const assignedTeamIds = new Set(judgeGroups.flatMap((group) => group.assignedTeams.map((team) => team.id)));
			unassignedTeams = teams.filter((team) => !team.absent && !assignedTeamIds.has(team.id));
		}
	}

	const canJumpSteps = $derived(isEditingEventSetup && app.isJudgesRoomJoined());
	const competitionReady = $derived(isCompetitionSetupReady(eventName, robotEventsEventId, teams.length));
	const judgesReady = $derived(isJudgeSetupReady(judgingMethod, judgeGroups, teams));
	const setupBlockers = $derived.by(() => {
		if (!canJumpSteps) return [];
		const blockers: { step: number; label: string }[] = [];
		if (!competitionReady) blockers.push({ step: 2, label: m.competition_setup() });
		if (!judgesReady) blockers.push({ step: 4, label: m.judge_setup() });
		return blockers;
	});

	function stepLabel(step: number): string {
		switch (step) {
			case 1:
				return m.event_code();
			case 2:
				return m.competition_setup();
			case 3:
				return m.team_groups();
			case 4:
				return m.judge_setup();
			case 5:
				return m.awards_setup();
			default:
				return m.other_settings();
		}
	}

	function selectedAwardNames(options: { name: string; isSelected: boolean }[]): string[] {
		return options.filter((award) => award.isSelected).map((award) => award.name);
	}

	const removedSavedAwardNames = $derived.by(() => {
		if (!app.isJudgesRoomJoined()) return [];
		const saved = app.getEssentialData();
		if (!saved) return [];
		const kept = new Set(selectedAwardNames(awardOptions));
		return saved.awards.map((award) => award.name).filter((name) => !kept.has(name));
	});

	function goToStep(step: number) {
		if (!canJumpSteps || step < 1 || step > totalSteps || step === currentStep) return;
		currentStep = step;
	}

	async function requestExit() {
		const confirmed = await dialogs.showConfirmation({
			title: m.discard_event_setup_changes_title(),
			message: m.discard_event_setup_changes_message(),
			confirmText: m.back_to_judges_room(),
			cancelText: m.cancel(),
			confirmButtonClass: 'danger'
		});
		if (confirmed) cancelSetup();
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
				accessControlEnabled,
				judgeGuideVersion,
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

				AppUI.appPhase = 'workspace';

				if (accessControlEnabled && !wasAccessControlEnabled) {
					const accessLink = app.getJudgesRoomUrl();
					await dialogs.showCustom(AccessLinkVerifyDialog, {
						props: { accessLink },
						maxWidth: 'max-w-xl'
					});
				}
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
				if (accessControlEnabled) {
					app.setCurrentUserLocally({ role: 'judge_advisor' });
				} else {
					await app.selectUser({ role: 'judge_advisor' });
				}

				AppUI.appPhase = 'workspace';

				if (accessControlEnabled) {
					const accessLink = app.getJudgesRoomUrl();
					await dialogs.showCustom(AccessLinkVerifyDialog, {
						props: { accessLink },
						maxWidth: 'max-w-xl'
					});
				}
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

	// A room always has at least one judge group, even while that step is closed.
	$effect(() => {
		if (!loaded) return;
		if (judgeGroups.length === 0) {
			judgeGroups.push(new EditingJudgeGroup('Group 1'));
		}
	});

	// Drop assignments for teams that were removed, and keep the unassigned list current.
	$effect(() => {
		if (!loaded) return;

		const activeTeams = teams.filter((team) => !team.absent);
		const activeIds = new Set(activeTeams.map((team) => team.id));

		untrack(() => {
			for (const group of judgeGroups) {
				group.assignedTeams = group.assignedTeams.filter((team) => activeIds.has(team.id));
			}

			const assignedIds = new Set(judgeGroups.flatMap((group) => group.assignedTeams.map((team) => team.id)));
			unassignedTeams = activeTeams.filter((team) => !assignedIds.has(team.id));
		});
	});

	// Initialize component
	onMount(async () => {
		// Load current data from app
		loadCurrentData();
		loaded = true;

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
			<!-- Mobile -->
			<div class="space-y-3 md:hidden">
				<div class="flex items-center justify-between gap-3">
					<h1 class="text-xl font-bold text-gray-900">{m.event_setup()}</h1>
					{#if !canJumpSteps}
						<div class="text-sm font-medium text-gray-600">
							{m.step_of({ current: currentStep, total: totalSteps })}
						</div>
					{/if}
				</div>
				{#if canJumpSteps}
					<button type="button" onclick={requestExit} class="text-sm font-medium text-slate-600 underline hover:text-slate-900">
						{m.back_to_judges_room()}
					</button>
					{@render setupSteps(true)}
				{/if}
			</div>

			<!-- Desktop -->
			<div class="hidden items-center justify-between gap-6 md:flex">
				<div class="space-y-2">
					<h1 class="text-3xl font-bold text-gray-900">{m.event_setup()}</h1>
					{#if canJumpSteps}
						<button type="button" onclick={requestExit} class="text-sm font-medium text-slate-600 underline hover:text-slate-900">
							{m.back_to_judges_room()}
						</button>
					{/if}
				</div>
				{@render setupSteps(false)}
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
				/>
			{:else if currentStep === 2}
				<CompetitionSetupStep
					{robotEventsEventId}
					allowIncompleteNext={canJumpSteps}
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
					allowIncompleteNext={canJumpSteps}
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
				<ReviewStep
					onPrev={prevStep}
					onComplete={completeSetup}
					onJumpToStep={goToStep}
					removedAwardNames={removedSavedAwardNames}
					blockers={setupBlockers}
					isJudgesRoomJoined={app.isJudgesRoomJoined()}
					bind:accessControlEnabled
				/>
			{/if}
		</div>
	</div>
</div>

{#snippet setupSteps(compact: boolean)}
	<div class={['flex items-center', compact && 'overflow-x-auto p-1.5']}>
		{#each Array(totalSteps) as _, i (i)}
			{@const step = i + 1}
			{@const reached = step <= currentStep}
			{@const incomplete = setupBlockers.some((blocker) => blocker.step === step)}
			<div class="flex items-center">
				{#if canJumpSteps}
					<button
						type="button"
						aria-current={step === currentStep ? 'step' : undefined}
						aria-label={m.go_to_step({ step, name: stepLabel(step) })}
						onclick={() => goToStep(step)}
						class={[
							'flex items-center justify-center rounded-full font-medium transition-colors',
							compact ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm',
							incomplete ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white',
							step === currentStep && 'ring-2 ring-slate-900 ring-offset-2'
						]}
					>
						{step}
					</button>
				{:else}
					<div
						class={[
							'flex items-center justify-center rounded-full font-medium',
							compact ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm',
							reached ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-500'
						]}
					>
						{step}
					</div>
				{/if}
				{#if step < totalSteps}
					<div class={['mx-2 h-0.5', compact ? 'w-3' : 'w-12', !canJumpSteps && step < currentStep ? 'bg-slate-900' : 'bg-gray-200']}></div>
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

<style lang="postcss">
	@reference 'tailwindcss';

	:global {
		body {
			@apply bg-slate-100;
		}
	}
</style>
