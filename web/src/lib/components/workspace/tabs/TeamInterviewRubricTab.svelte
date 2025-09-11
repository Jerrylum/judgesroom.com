<script lang="ts">
	import './rubric.css';
	import { app } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { TeamInterviewRubricTab } from '$lib/tab.svelte';
	import ScoreButtons from './ScoreButtons.svelte';
	import { generateUUID } from '$lib/utils.svelte';

	interface Props {
		tab: TeamInterviewRubricTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const allTeams = $derived(app.getAllTeams());
	const currentUser = $derived(app.getCurrentUser());
	const essentialData = $derived(app.getEssentialData());

	// Use current user's judge information with reactive validation
	const currentJudge = $derived(() => {
		if (!currentUser || currentUser.role !== 'judge') {
			throw new Error('CRITICAL: TeamInterviewRubricTab can only be accessed by judges');
		}
		return currentUser.judge;
	});

	// Check if the event uses assigned judging method
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');

	// Get current judge's group
	const currentJudgeGroup = $derived(() => {
		if (!currentJudge()) return null;
		return app.getCurrentUserJudgeGroup(currentJudge().id);
	});

	// State for showing only assigned teams
	let showOnlyAssignedTeams = $state(true);

	// Local state for the rubric form (no judge selection needed)
	let rubricScores = $state<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let notes = $state('');

	// Scroll container references for synchronization
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

	// Get teams to display based on filter
	const teamsToShow = $derived(() => {
		let teams = [...allTeams];
		
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup()) {
			// Filter to only show assigned teams for current judge group
			const assignedTeamIds = new Set(currentJudgeGroup()!.assignedTeams);
			teams = teams.filter(team => assignedTeamIds.has(team.id));
		}
		
		// Sort teams by number for consistent display
		return teams.sort((a, b) => a.number.localeCompare(b.number));
	});

	// Get the selected team details
	const selectedTeam = $derived(allTeams.find((team) => team.id === tab.teamId));

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
			alert('Please select a team');
			return;
		}

		// TODO: Implement actual save functionality via WRPC
		console.log('Saving rubric:', {
			id: generateUUID(),
			teamId: tab.teamId,
			judgeId: currentJudge().id,
			rubric: rubricScores,
			notes: notes
		});

		alert('Rubric saved successfully! (This is a placeholder)');
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
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">Team Interview Rubric</h2>
				
				<!-- Filter Controls -->
				{#if isAssignedJudging}
					<div class="mb-4">
						<label class="flex items-center">
							<input 
								type="checkbox" 
								bind:checked={showOnlyAssignedTeams}
								class="mr-2 rounded border-gray-300"
							>
							<span class="text-sm text-gray-700">
								Only show assigned teams for your current judge group
								{#if currentJudgeGroup()}
									({currentJudgeGroup()!.name})
								{/if}
							</span>
						</label>
					</div>
				{/if}
				
				<div class="mb-4">
					<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700"><strong>Team #</strong></label>
					<select id="team-select" bind:value={tab.teamId} class="classic mt-1 block w-full">
						<option value="">Select a team...</option>
						{#each teamsToShow() as team (team.id)}
							<option value={team.id}>{team.number} - {team.name}</option>
						{/each}
					</select>
				</div>

				{#if selectedTeam}
					<div class="mb-4 rounded-lg bg-gray-50 p-4">
						<div class=" text-sm text-gray-800">
							<p><strong>Team #{selectedTeam.number}:</strong> {selectedTeam.name}</p>
							<p><strong>School:</strong> {selectedTeam.school}</p>
							<p><strong>Grade Level:</strong> {selectedTeam.grade}</p>
						</div>
					</div>
				{/if}

				<!-- Current Judge Information (Read-only) -->
				<div class="mt-2 text-sm text-gray-700">
					<p><strong>Judge Name:{' '}</strong>{currentJudge().name}</p>
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
								<ScoreButtons bind:variable={rubricScores[0]} />
								<!-- <p class="text-lg">{q1}</p> -->
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
								<ScoreButtons bind:variable={rubricScores[1]} />
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
								<ScoreButtons bind:variable={rubricScores[2]} />
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
								<ScoreButtons bind:variable={rubricScores[3]} />
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
								<ScoreButtons bind:variable={rubricScores[4]} />
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
								<ScoreButtons bind:variable={rubricScores[5]} />
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
								<ScoreButtons bind:variable={rubricScores[6]} />
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
								<ScoreButtons bind:variable={rubricScores[7]} />
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
								<ScoreButtons bind:variable={rubricScores[8]} />
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
										<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes}></textarea>
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
			</div>
		</div>
	</div>
</Tab>
