<script lang="ts">
	import { app, dialogs } from '$lib/index.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import type { EssentialData } from '@judgesroom.com/protocol/src/event';
	import type { Judge } from '@judgesroom.com/protocol/src/judging';
	import type { TeamData } from '@judgesroom.com/protocol/src/team';
	import type { AwardNomination, AwardRankingsPartialUpdate } from '@judgesroom.com/protocol/src/rubric';
	import AlertDialog from '$lib/components/dialog/AlertDialog.svelte';
	import ConfirmationDialog from '$lib/components/dialog/ConfirmationDialog.svelte';
	import PromptDialog from '$lib/components/dialog/PromptDialog.svelte';
	import initialData from '$lib/demo-data/initialData.json';
	import teamAttendance from '$lib/demo-data/teamAttendance.json';
	import insertNotebookLinks from '$lib/demo-data/insertNotebookLinks.json';
	import sortNotebookLinks from '$lib/demo-data/sortNotebookLinks.json';
	import awardRanking from '$lib/demo-data/awardRanking.json';
	import awardNomination from '$lib/demo-data/awardNomination.json';

	const currentDialog = $derived(dialogs.currentDialog);

	// Step tracking state
	let currentStep = $state(0);
	let stepStatus = $state<('pending' | 'running' | 'completed' | 'error')[]>([
		'pending',
		'pending',
		'pending',
		'pending',
		'pending',
		'pending',
		'pending'
	]);
	let stepMessages = $state<string[]>(['', '', '', '', '', '', '']);
	let judges: any[] = [];

	// Demo data injection steps
	const steps = [
		{
			title: 'Initialize Event Setup',
			description: 'Load essential event data, teams, and judge groups. This sets up the basic structure for the judging system.',
			action: async () => {
				app.handleEssentialDataUpdate(initialData.essentialData as EssentialData);
				app.handleAllTeamDataUpdate(initialData.teamData as TeamData[]);
				app.handleAllJudgesUpdate(initialData.judges as Judge[]);
				await app.createJudgesRoom();
				await app.selectUser({ role: 'judge_advisor' });
				return 'Event setup completed with teams and judge groups initialized.';
			}
		},
		{
			title: 'Create Judges',
			description: 'Create individual judges and assign them to judge groups. Each group gets 3 judges for comprehensive evaluation.',
			action: async () => {
				const judgeGroups = app.getAllJudgeGroups();
				const jg1id = judgeGroups[0].id;
				const jg2id = judgeGroups[1].id;

				const j1id = uuidv4();
				const j2id = uuidv4();
				const j3id = uuidv4();
				const j4id = uuidv4();
				const j5id = uuidv4();
				const j6id = uuidv4();

				judges = [
					{ id: j1id, groupId: jg1id, groupIdx: 0 },
					{ id: j2id, groupId: jg1id, groupIdx: 0 },
					{ id: j3id, groupId: jg1id, groupIdx: 0 },
					{ id: j4id, groupId: jg2id, groupIdx: 1 },
					{ id: j5id, groupId: jg2id, groupIdx: 1 },
					{ id: j6id, groupId: jg2id, groupIdx: 1 }
				];

				await app.wrpcClient.judge.updateJudge.mutation({ id: j1id, name: 'Judge 1', groupId: jg1id });
				await app.wrpcClient.judge.updateJudge.mutation({ id: j2id, name: 'Judge 2', groupId: jg1id });
				await app.wrpcClient.judge.updateJudge.mutation({ id: j3id, name: 'Judge 3', groupId: jg1id });
				await app.wrpcClient.judge.updateJudge.mutation({ id: j4id, name: 'Judge 4', groupId: jg2id });
				await app.wrpcClient.judge.updateJudge.mutation({ id: j5id, name: 'Judge 5', groupId: jg2id });
				await app.wrpcClient.judge.updateJudge.mutation({ id: j6id, name: 'Judge 6', groupId: jg2id });

				return `Created 6 judges across ${judgeGroups.length} judge groups.`;
			}
		},
		{
			title: 'Setup Team Data',
			description: 'Configure team attendance and engineering notebook links. This prepares teams for the judging process.',
			action: async () => {
				await app.wrpcClient.team.updateAllTeamData.mutation(teamAttendance as TeamData[]);

				for (const data of insertNotebookLinks) {
					await app.wrpcClient.team.updateTeamData.mutation(data as TeamData);
				}

				for (const data of sortNotebookLinks) {
					await app.wrpcClient.team.updateTeamData.mutation(data as TeamData);
				}

				const teams = app.getAllTeamInfoAndData();
				const attendingTeams = Object.values(teams).filter((team) => !team.absent).length;
				const teamsWithNotebooks = Object.values(teams).filter((team) => team.notebookDevelopmentStatus === 'fully_developed').length;

				return `Updated ${attendingTeams} attending teams, ${teamsWithNotebooks} with completed notebooks.`;
			}
		},
		{
			title: 'Complete Notebook Evaluations',
			description: 'Generate engineering notebook rubric submissions for all teams with completed notebooks.',
			action: async () => {
				const teams = app.getAllTeamInfoAndData();
				const judgeGroups = app.getAllJudgeGroups();
				let submissionCount = 0;

				for (const team of Object.values(teams)) {
					if (team.notebookDevelopmentStatus !== 'fully_developed') {
						continue;
					}
					for (const judge of judges) {
						if (judgeGroups[judge.groupIdx].assignedTeams.includes(team.id) === false) {
							continue;
						}
						await app.wrpcClient.judging.completeEngineeringNotebookRubric.mutation({
							judgeGroupId: judge.groupId,
							submission: {
								id: uuidv4(),
								teamId: team.id,
								judgeId: judge.id,
								rubric: generateRubricScores(11),
								notes: '',
								innovateAwardNotes: '',
								timestamp: Date.now()
							}
						});
						submissionCount++;
					}
				}

				return `Completed ${submissionCount} engineering notebook evaluations.`;
			}
		},
		{
			title: 'Complete Team Interviews',
			description: 'Generate team interview rubric submissions for all attending teams.',
			action: async () => {
				const teams = app.getAllTeamInfoAndData();
				const judgeGroups = app.getAllJudgeGroups();
				let submissionCount = 0;

				for (const team of Object.values(teams)) {
					if (team.absent) {
						continue;
					}
					for (const judge of judges) {
						if (judgeGroups[judge.groupIdx].assignedTeams.includes(team.id) === false) {
							continue;
						}
						await app.wrpcClient.judging.completeTeamInterviewRubric.mutation({
							judgeGroupId: judge.groupId,
							submission: {
								id: uuidv4(),
								teamId: team.id,
								judgeId: judge.id,
								rubric: generateRubricScores(9),
								notes: '',
								timestamp: Date.now()
							}
						});
						submissionCount++;
					}
				}

				return `Completed ${submissionCount} team interview evaluations.`;
			}
		},
		{
			title: 'Setup Award Rankings',
			description: 'Configure initial award rankings based on team performance and judging criteria.',
			action: async () => {
				for (const data of awardRanking) {
					await app.wrpcClient.judging.updateAwardRanking.mutation(data as AwardRankingsPartialUpdate);
				}

				return `Configured award rankings for ${awardRanking.length} award categories.`;
			}
		},
		{
			title: 'Start Award Deliberation',
			description: 'Begin the award deliberation process and submit final award nominations.',
			action: async () => {
				await app.wrpcClient.judging.startAwardDeliberation.mutation();

				for (const data of awardNomination) {
					await app.wrpcClient.judging.nominateFinalAward.mutation(data);
				}

				return `Award deliberation started with ${awardNomination.length} nominations submitted.`;
			}
		}
	];

	function generateRubricScores(len: number): number[] {
		return Array.from({ length: len }, () => Math.floor(Math.random() * 5) + 1);
	}

	async function executeStep(stepIndex: number) {
		if (stepIndex < 0 || stepIndex >= steps.length) return;

		// Check if we need permission for the first step
		if (stepIndex === 0) {
			const hasPermit = app.hasPermit();
			if (hasPermit) {
				const answer = await dialogs.showConfirmation({
					title: 'Demo Data Injection',
					message: 'Are you sure you want to inject demo data? This will set up a complete judging session.',
					confirmText: 'Yes, Start Demo',
					cancelText: 'Cancel',
					confirmButtonClass: 'primary',
					cancelButtonClass: 'secondary'
				});

				if (!answer) {
					return;
				}
			}
		}

		// Update status to running
		stepStatus[stepIndex] = 'running';
		stepMessages[stepIndex] = 'Executing...';
		currentStep = stepIndex;

		try {
			const message = await steps[stepIndex].action();
			stepStatus[stepIndex] = 'completed';
			stepMessages[stepIndex] = message;

			// Auto-advance to next step if not the last one
			if (stepIndex < steps.length - 1) {
				currentStep = stepIndex + 1;
			}
		} catch (error) {
			stepStatus[stepIndex] = 'error';
			stepMessages[stepIndex] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			console.error('Step execution failed:', error);
		}
	}

	async function executeAllSteps() {
		for (let i = 0; i < steps.length; i++) {
			if (stepStatus[i] === 'completed') continue;
			await executeStep(i);
			if (stepStatus[i] === 'error') break;
		}

		// Show completion dialog if all steps completed
		if (stepStatus.every((status) => status === 'completed')) {
			dialogs.showAlert({
				title: 'Demo Data Injection Complete',
				message: 'All demo data has been successfully injected. The judging system is now ready for use.',
				confirmText: 'OK',
				confirmButtonClass: 'primary'
			});
		}
	}

	function resetSteps() {
		currentStep = 0;
		stepStatus = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'];
		stepMessages = ['', '', '', '', '', '', ''];
		judges = [];
	}

	function getStepIcon(status: string) {
		switch (status) {
			case 'completed':
				return '✓';
			case 'running':
				return '⟳';
			case 'error':
				return '✗';
			default:
				return '○';
		}
	}

	function getStepClass(status: string) {
		switch (status) {
			case 'completed':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'running':
				return 'text-slate-600 bg-slate-50 border-slate-200';
			case 'error':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}
</script>

<div class="min-h-screen w-screen bg-slate-100 p-8">
	<div class="mx-auto max-w-4xl">
		<div class="mb-8 rounded-md bg-white p-6 shadow-sm">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">Demo Data Injection</h1>
			<p class="mb-6 text-gray-600">Set up a complete judging session with sample data.</p>

			<!-- Control Buttons -->
			<div class="mb-8 flex gap-4">
				<button
					onclick={() => executeAllSteps()}
					class="primary"
					disabled={stepStatus.some((status) => status === 'running')}
				>
					Execute All Steps
				</button>
				<button
					onclick={() => resetSteps()}
					class="secondary"
					disabled={stepStatus.some((status) => status === 'running')}
				>
					Reset All Steps
				</button>
			</div>
		</div>

		<!-- Steps List -->
		<div class="space-y-4">
			{#each steps as step, index}
				<div class="rounded-md bg-white shadow-sm {getStepClass(stepStatus[index])} transition-all duration-200">
					<div class="p-6">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold {getStepClass(
											stepStatus[index]
										)}"
									>
										{#if stepStatus[index] === 'running'}
											<div class="animate-spin">⟳</div>
										{:else}
											{getStepIcon(stepStatus[index])}
										{/if}
									</div>
									<h3 class="text-xl font-semibold text-gray-900">
										Step {index + 1}: {step.title}
									</h3>
								</div>

								<p class="mb-4 ml-11 text-gray-600">
									{step.description}
								</p>

								{#if stepMessages[index]}
									<div
										class="ml-11 rounded-md p-3 {stepStatus[index] === 'error'
											? 'bg-red-50 text-red-700'
											: 'bg-green-50 text-green-700'} text-sm"
									>
										{stepMessages[index]}
									</div>
								{/if}
							</div>

							<div class="ml-4">
								<button
									onclick={() => executeStep(index)}
									disabled={stepStatus[index] === 'running' || stepStatus.some((status) => status === 'running')}
									class="primary tiny"
								>
									{#if stepStatus[index] === 'completed'}
										Re-run Step
									{:else if stepStatus[index] === 'running'}
										Running...
									{:else if stepStatus[index] === 'error'}
										Retry Step
									{:else}
										Run Step
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Progress Summary -->
		<div class="mt-8 rounded-lg bg-white p-6 shadow-md">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Progress Summary</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">
						{stepStatus.filter((status) => status === 'completed').length}
					</div>
					<div class="text-sm text-gray-600">Completed</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-slate-600">
						{stepStatus.filter((status) => status === 'running').length}
					</div>
					<div class="text-sm text-gray-600">Running</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-red-600">
						{stepStatus.filter((status) => status === 'error').length}
					</div>
					<div class="text-sm text-gray-600">Errors</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-gray-400">
						{stepStatus.filter((status) => status === 'pending').length}
					</div>
					<div class="text-sm text-gray-600">Pending</div>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="mt-4">
				<div class="mb-1 flex justify-between text-sm text-gray-600">
					<span>Overall Progress</span>
					<span>{Math.round((stepStatus.filter((status) => status === 'completed').length / steps.length) * 100)}%</span>
				</div>
				<div class="h-2 w-full rounded-full bg-gray-200">
					<div
						class="h-2 rounded-full bg-slate-600 transition-all duration-300"
						style="width: {(stepStatus.filter((status) => status === 'completed').length / steps.length) * 100}%"
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Dialog System -->
{#if currentDialog}
	{#if currentDialog.type === 'alert'}
		<AlertDialog dialog={currentDialog} />
	{:else if currentDialog.type === 'confirmation'}
		<ConfirmationDialog dialog={currentDialog} />
	{:else if currentDialog.type === 'prompt'}
		<PromptDialog dialog={currentDialog} />
	{:else if currentDialog.type === 'custom'}
		{@const Component = currentDialog.component}

		<!-- <svelte:component this={currentDialog.component as any} {...currentDialog.props} /> -->
		<!-- https://svelte.dev/e/svelte_component_deprecated -->
		<Component {...currentDialog.props} />
	{/if}
{/if}
