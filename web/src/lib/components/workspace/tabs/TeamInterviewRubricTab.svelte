<script lang="ts">
	import './rubric.css';
	import { app } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { TeamInterviewRubricTab } from '$lib/tab.svelte';
	import ScoreButtons from './ScoreButtons.svelte';

	interface Props {
		tab: TeamInterviewRubricTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Get essential data for teams and judge groups
	const essentialData = $derived(app.getEssentialData());
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
	let interviewNotes = $state('');
	let rubricScores = $state<Record<string, number>>({});

	// Scroll container references for synchronization
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

	// Get the selected team details
	const selectedTeam = $derived(allTeams.find((team) => team.id === selectedTeamId));

	// Mock rubric criteria - in real implementation, this would come from the protocol
	const rubricCriteria = [
		{ id: 'presentation', name: 'Presentation Skills', maxScore: 10, description: 'How well the team presents their work' },
		{ id: 'knowledge', name: 'Technical Knowledge', maxScore: 10, description: 'Understanding of technical concepts' },
		{ id: 'teamwork', name: 'Teamwork & Collaboration', maxScore: 10, description: 'Evidence of effective teamwork' },
		{ id: 'problem_solving', name: 'Problem Solving', maxScore: 10, description: 'Approach to problem solving' }
	];

	// Initialize scores
	$effect(() => {
		if (Object.keys(rubricScores).length === 0) {
			const initialScores: Record<string, number> = {};
			rubricCriteria.forEach((criteria) => {
				initialScores[criteria.id] = 0;
			});
			rubricScores = initialScores;
		}
	});

	// Calculate total score
	const totalScore = $derived(() => {
		return Object.values(rubricScores).reduce((sum, score) => sum + score, 0);
	});

	const maxTotalScore = $derived(() => {
		return rubricCriteria.reduce((sum, criteria) => sum + criteria.maxScore, 0);
	});

	function updateScore(criteriaId: string, score: number) {
		rubricScores[criteriaId] = score;
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

	async function saveRubric() {
		if (!selectedTeamId) {
			alert('Please select a team');
			return;
		}

		// TODO: Implement actual save functionality via WRPC
		console.log('Saving rubric:', {
			teamId: selectedTeamId,
			judgeId: currentJudge().id,
			judgeGroupId: currentJudge().groupId,
			scores: rubricScores,
			notes: interviewNotes,
			totalScore: totalScore(),
			maxScore: maxTotalScore()
		});

		alert('Rubric saved successfully! (This is a placeholder)');
	}


	let q1 = $state(-1);
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
								<ScoreButtons variable={q1} />
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
								<ScoreButtons variable={q1} />
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
							<scoring class="min-w-14">TOTAL<br />SCORE</scoring>
						</row>
					</rubric-body>
				</rubric-table>

				<p class="mt-2 text-center text-xs italic">
					All judging materials are strictly confidential. They are not shared beyond the Judges and Judge Advisor and shall be destroyed at
					the end of the event.
				</p>
			</div>

			<!-- Rubric Scoring -->
			{#if false}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-medium text-gray-900">Scoring Rubric</h3>
					<div class="space-y-6">
						{#each rubricCriteria as criteria (criteria.id)}
							<div class="border-b border-gray-200 pb-6 last:border-b-0">
								<div class="mb-2 flex items-center justify-between">
									<h4 class="font-medium text-gray-900">{criteria.name}</h4>
									<div class="text-sm text-gray-500">
										{rubricScores[criteria.id] || 0} / {criteria.maxScore}
									</div>
								</div>
								<p class="mb-3 text-sm text-gray-600">{criteria.description}</p>
								<div class="flex items-center space-x-2">
									<input
										type="range"
										min="0"
										max={criteria.maxScore}
										step="1"
										value={rubricScores[criteria.id] || 0}
										oninput={(e) => updateScore(criteria.id, parseInt((e.target as HTMLInputElement).value))}
										class="flex-1"
									/>
									<input
										type="number"
										min="0"
										max={criteria.maxScore}
										step="1"
										value={rubricScores[criteria.id] || 0}
										oninput={(e) => updateScore(criteria.id, parseInt((e.target as HTMLInputElement).value) || 0)}
										class="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm"
									/>
								</div>
							</div>
						{/each}

						<!-- Total Score Display -->
						<div class="rounded-lg bg-gray-50 p-4">
							<div class="flex items-center justify-between">
								<span class="text-lg font-medium text-gray-900">Total Score</span>
								<span class="text-xl font-bold text-blue-600">
									{totalScore()} / {maxTotalScore()}
								</span>
							</div>
							<div class="mt-2">
								<div class="h-2 w-full rounded-full bg-gray-200">
									<div
										class="h-2 rounded-full bg-blue-600 transition-all duration-300"
										style="width: {(totalScore() / maxTotalScore()) * 100}%"
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Interview Notes -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-medium text-gray-900">Interview Notes</h3>
					<textarea
						bind:value={interviewNotes}
						placeholder="Enter detailed notes about the team's interview performance..."
						rows="6"
						class="classic block w-full"
					></textarea>
				</div>

				<!-- Actions -->
				<div class="flex justify-end space-x-3">
					<button onclick={saveRubric} class="primary"> Save Rubric </button>
				</div>
			{/if}
		</div>
	</div>
</Tab>

<style lang="postcss">
	@reference "tailwindcss";

	button.score-button {
		@apply flex h-6 w-6 flex-col items-center p-1 text-center hover:font-bold;
	}
</style>
