<script lang="ts">
	import './rubric.css';
	import { app, tabs, subscriptions } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { TeamInterviewRubricTab } from '$lib/tab.svelte';
	import ScoringButtons from './ScoringButtons.svelte';
	import { generateUUID } from '$lib/utils.svelte';
	import { untrack } from 'svelte';
	import { sortByAssignedTeams, sortByTeamNumber } from '$lib/team.svelte';
	import WarningSign from './WarningSign.svelte';
	import AwardRankingTable from './AwardRankingTable.svelte';

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

	async function loadRubric() {
		if (!tab.rubricId) return;
		try {
			const existingRubric = await app.wrpcClient.judging.getTeamInterviewRubrics.query({ id: tab.rubricId });
			tab.teamId = existingRubric.teamId;
			judgeId = existingRubric.judgeId;
			rubricScores = existingRubric.rubric as number[];
			notes = existingRubric.notes;
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
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;
	let mainScrollContainer: HTMLElement;

	// Get teams to display based on filter
	const teamsToShow = $derived(() => {
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup && !isSubmitted) {
			return sortByAssignedTeams(includedTeams, currentJudgeGroup.assignedTeams);
		} else {
			return sortByTeamNumber(Object.values(includedTeams));
		}
	});

	// Calculate total score
	const totalScore = $derived.by(() => {
		if (rubricScores.find((score) => score === -1)) {
			return 'N/A';
		} else {
			return rubricScores.reduce((sum, score) => sum + score, 0).toString();
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
			// Save the rubric via WRPC
			await app.wrpcClient.judging.completeTeamInterviewRubric.mutation({
				judgeGroupId: currentJudgeGroup.id,
				submission: {
					id: (tab.rubricId = generateUUID()),
					teamId: tab.teamId,
					judgeId,
					rubric: rubricScores,
					notes
				}
			});

			isSubmitted = true;
			app.addSuccessNotice('Team interview rubric saved successfully!');
		} catch (error) {
			console.error('Failed to save team interview rubric:', error);
			app.addErrorNotice('Failed to save team interview rubric');
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

		// Scroll to top
		mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// Synchronize scroll positions across all containers
	function syncScrollPosition(sourceContainer: HTMLElement) {
		if (isSyncing) return; // Prevent infinite loop

		isSyncing = true;
		const scrollLeft = sourceContainer.scrollLeft;

		scrollContainers.forEach((container) => {
			if (container !== sourceContainer) {
				container.scrollLeft = scrollLeft;
			}
		});

		// Use setTimeout to reset the flag after all scroll events have been processed
		setTimeout(() => {
			isSyncing = false;
		}, 0);
	}

	// Register scroll container and add event listener
	function registerScrollContainer(container: HTMLElement) {
		if (!scrollContainers.includes(container)) {
			scrollContainers.push(container);
			container.addEventListener('scroll', () => syncScrollPosition(container));
		}
	}
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6" bind:this={mainScrollContainer}>
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">Team Interview Rubric</h2>

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

				<div class="mb-4">
					<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700"><strong>Team #</strong></label>
					<select id="team-select" bind:value={tab.teamId} class="classic mt-1 block w-full" disabled={isSubmitted}>
						<option value="">Select a team...</option>
						{#each teamsToShow() as team (team.id)}
							<option value={team.id}>{team.number} - {team.name}</option>
						{/each}
					</select>
				</div>

				{#if tab.teamId}
					{@const selectedTeam = includedTeams[tab.teamId]}
					<div class="mb-4 rounded-lg bg-gray-50 p-4">
						<div class=" text-sm text-gray-800">
							<p><strong>Team #{selectedTeam.number}:</strong> {selectedTeam.name}</p>
							<p><strong>School:</strong> {selectedTeam.school}</p>
							<p><strong>Grade Level:</strong> {selectedTeam.grade}</p>
						</div>
					</div>

					{#if selectedTeam.excluded}
						<WarningSign title="Excluded Team">
							<p>This team has been marked as excluded. They are not eligible for any Judged Awards.</p>
						</WarningSign>
					{/if}
				{/if}

				<!-- Current Judge Information (Read-only) -->
				<div class="mt-2 text-sm text-gray-700">
					{#if judgeId}
						<p><strong>Judge Name:{' '}</strong>{app.findJudgeById(judgeId)?.name}</p>
					{:else}
						<p>(Please switch to a judge in order to submit the rubric)</p>
					{/if}
				</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<p class="mb-6 text-sm text-gray-600">
					<strong>Directions:</strong> Determine a point value that best characterizes the content of the Team Interview for that criterion.
				</p>

				<rubric-table>
					<rubric-header>
						<criteria class="max-w-42 min-w-42 bg-gray-400">CRITERIA</criteria>
						<scroll-container use:registerScrollContainer>
							<content class="min-w-120 flex-col! gap-2 bg-gray-200">
								<div class="p-0! pt-1 text-center text-base font-bold">PROFICIENCY LEVEL</div>
								<div class="border-0! p-0! flex text-center">
									<div class="flex-1 border-r pb-1">
										<p class="font-bold">EXPERT</p>
										<p class="text-xs">(4-5 POINTS)</p>
									</div>
									<div class="flex-1 pb-1">
										<p class="font-bold">PROFICIENT</p>
										<p class="text-xs">(2-3 POINTS)</p>
									</div>
									<div class="flex-1 border-l pb-1">
										<p class="font-bold">EMERGING</p>
										<p class="text-xs">(0-1 POINTS)</p>
									</div>
								</div>
							</content>
						</scroll-container>
						<scoring class="flex-col! min-w-14 bg-gray-200">
							<div class="pt-1">&nbsp;</div>
							<div class="flex items-center p-1 font-bold">
								<span>POINTS</span>
							</div>
						</scoring>
					</rubric-header>
					<rubric-body>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ENGINEERING DESIGN PROCESS</p>
								<i class="text-xs text-gray-500">All Awards</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Team shows evidence of independent inquiry <u>from the beginning stages</u> of their design process. This includes brainstorming,
										testing, and exploring alternative solutions.
									</div>
									<div>Team shows evidence of independent inquiry for <u>some elements</u> of their design process.</div>
									<div>Team <u>shows little to no evidence</u> of independent inquiry in their design process.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[0]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[0]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">GAME STRATEGY</p>
								<i class="text-xs text-gray-500">Design, Innovate, Create, Amaze</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>Team can fully explain their <u>entire</u> game strategy including game analysis.</div>
									<div>Team can explain their current strategy with <u>limited evidence of game analysis</u>.</div>
									<div>Team <u>did not explain</u> game strategy, or strategy is not student-directed.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[1]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[1]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ROBOT DESIGN</p>
								<i class="text-xs text-gray-500">Design, Innovate, Build Create, Amaze</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>Team can <u>fully explain</u> the evolution of their robot design to the current design.</div>
									<div>
										Team can provide a <u>limited description</u> of why the current robot design was chosen, but shows limited evolution.
									</div>
									<div>Team <u>did not explain</u> robot design, or design is not student-directed.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[2]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[2]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ROBOT BUILD</p>
								<i class="text-xs text-gray-500">Innovate, Build, Create, Amaze</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>Team can <u>fully explain</u> their robot construction. Ownership of the robot build is evident.</div>
									<div>Team can describe why the current robot design was chosen, but with <u>limited explanation</u>.</div>
									<div>Team <u>did not explain</u> robot build, or build is not student-directed.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[3]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[3]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ROBOT PROGRAMMING</p>
								<i class="text-xs text-gray-500">Design, Innovate, Think, Amaze</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>Team can <u>fully explain</u> the evolution of their programming.</div>
									<div>
										Team can describe how the current programs work, but with
										<u>limited evolution</u>.
									</div>
									<div>Team <u>did not explain</u> programming, or programming is not student-directed.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[4]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[4]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">CREATIVITY / ORIGINALITY</p>
								<i class="text-xs text-gray-500">Innovate, Create</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>Team can describe creative aspect(s) of their robot with clarity and detail.</div>
									<div>Team can describe a creative solution but the answer lacks detail.</div>
									<div>Team has difficulty describing a creative solution or gives minimal response.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[5]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[5]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">TEAM AND PROJECT MANAGEMENT</p>
								<i class="text-xs text-gray-500">All Awards</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Team can explain <u>how team progress was tracked against an overall project timeline</u>. Team can explain management
										of material and personnel resources.
									</div>
									<div>
										Team can explain <u>how team progress was monitored</u>, and some degree of management of material and personnel
										resources.
									</div>
									<div>Team <u>cannot explain how team progress was monitored</u> or how resources were managed.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[6]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[6]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">TEAMWORK, COMMUNICATION, PROFESSIONALISM</p>
								<i class="text-xs text-gray-500">All Awards</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<u>Most or all team members contribute to explanations</u> of the design process, game strategy, and other work done by the
										team.
									</div>
									<div>
										<u>Some team members contribute to explanations</u> of the design process, game strategy, and other work done by the team.
									</div>
									<div>
										<u>Few team members contribute to explanations</u> of the design process, game strategy, and other work done by the team.
									</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[7]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[7]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">RESPECT, COURTESY, POSITIVITY</p>
								<i class="text-xs text-gray-500">All Awards</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>Team consistently interacts respectfully, courteously, and positively in their interview.</div>
									<div>Team interactions show signs of respect and courtesy, but there is room for improvement.</div>
									<div>Team interactions lack respectful and courteous behavior.</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								{#if isSubmitted}
									<p class="text-lg">{rubricScores[8]}</p>
								{:else}
									<ScoringButtons bind:variable={rubricScores[8]} showError={showValidationErrors} />
								{/if}
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">SPECIAL ATTRIBUTES & OVERALL IMPRESSIONS</p>
								<i class="text-xs text-gray-500">Judges, Inspire</i>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<p>
											Does the team have any special attributes, accomplishments, or exemplary effort in overcoming challenges at this
											event? Did anything stand out about this team in their interview? Please describe:
										</p>
										<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}
										></textarea>
									</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14 gap-2">
								<p>TOTAL<br />SCORE</p>
								<p class="text-lg">{totalScore}</p>
							</scoring>
						</row>
					</rubric-body>
				</rubric-table>

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
				{@const awardRankings = subscriptions.allJudgeGroupsAwardRankings[currentJudgeGroup.id]}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Award Candidate Ranking</h3>
					<p class="mb-4 text-sm text-gray-600">
						Rate this team for specific awards based on your team interview by clicking on the boxes below. Use the star system (0-5 stars)
						to indicate how strong a candidate this team is for each award.
					</p>
					<AwardRankingTable listingTeams={[tab.teamId]} {awardRankings} />
				</div>
			{/if}
		</div>
	</div>
</Tab>
