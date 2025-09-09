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

	// Use current user's judge information with reactive validation
	const currentJudge = $derived(() => {
		if (!currentUser || currentUser.role !== 'judge') {
			throw new Error('CRITICAL: TeamInterviewRubricTab can only be accessed by judges');
		}
		return currentUser.judge;
	});

	// Local state for the rubric form (no judge selection needed)
	let selectedTeamId = $state(tab.teamId || '');
	let rubricScores = $state<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let notes = $state('');

	// Scroll container references for synchronization
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

	// Get the selected team details
	const selectedTeam = $derived(allTeams.find((team) => team.id === selectedTeamId));

	// Calculate total score
	const totalScore = $derived.by(() => {
		if (rubricScores.find((score) => score === -1)) {
			return 'N/A';
		} else {
			return rubricScores.reduce((sum, score) => sum + score, 0).toString();
		}
	});

	async function saveRubric() {
		if (!selectedTeamId) {
			alert('Please select a team');
			return;
		}

		// TODO: Implement actual save functionality via WRPC
		console.log('Saving rubric:', {
			id: generateUUID(),
			teamId: selectedTeamId,
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
				<div class="mb-4">
					<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700"><strong>Team #</strong></label>
					<select id="team-select" bind:value={selectedTeamId} class="classic mt-1 block w-full">
						<option value="">Select a team...</option>
						{#each allTeams as team (team.id)}
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
						<criteria class="min-w-42 max-w-42 bg-gray-400">CRITERIA</criteria>
						<scroll-container use:registerScrollContainer>
							<content class="min-w-120 flex-col! gap-2 bg-gray-200">
								<div class="p-0! text-base! pt-1 text-center font-bold">PROFICIENCY LEVEL</div>
								<div class="p-0! border-0! flex text-center">
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
							<criteria class="min-w-42 max-w-42">
								<p class="text-sm font-bold">ENGINEERING DESIGN PROCESS</p>
								<p class="text-xs italic text-gray-500">All Awards</p>
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
							<criteria class="min-w-42 max-w-42">
								<p class="text-sm font-bold">GAME STRATEGY</p>
								<p class="text-xs italic text-gray-500">Design, Innovate, Create, Amaze</p>
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
							<criteria class="min-w-42 max-w-42">
								<p class="text-sm font-bold">SPECIAL ATTRIBUTES & OVERALL IMPRESSIONS</p>
								<p class="text-xs italic text-gray-500">Judges, Inspire</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<p>
											Does the team have any special attributes, accomplishments, or exemplary effort in overcoming challenges at this
											event? Did anything stand out about this team in their interview? Please describe:
										</p>
										<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1"></textarea>
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
