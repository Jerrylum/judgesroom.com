<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { TeamInterviewRubricTab } from '$lib/tab.svelte';

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
			<div class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
				<p class="text-sm text-gray-600">
					<strong>Directions:</strong> Determine a point value that best characterizes the content of the Team Interview for that criterion.
				</p>

				<rubric-table>
					<rubric-header>
						<aside class="border-r-3 min-w-42 max-w-42 text-base! bg-gray-400">CRITERIA</aside>
						<scroll-container>
							<content class="min-w-120 flex-col! items-stretch! flex gap-2 bg-gray-200 font-bold">
								<div class="p-0! text-base! pt-1 text-center">PROFICIENCY LEVEL</div>
								<div class="p-0! border-0! flex items-center justify-center text-center">
									<div class="flex-1 border-r pb-1">
										<p>EXPERT</p>
										<p class="text-xs font-normal">(4-5 POINTS)</p>
									</div>
									<div class="flex-1 pb-1">
										<p>PROFICIENT</p>
										<p class="text-xs font-normal">(2-3 POINTS)</p>
									</div>
									<div class="flex-1 border-l pb-1">
										<p>EMERGING</p>
										<p class="text-xs font-normal">(0-1 POINTS)</p>
									</div>
								</div>
							</content>
						</scroll-container>
						<aside class="flex-0! flex-col! items-stretch! min-w-14! bg-gray-200">
							<div class="pt-1">&nbsp;</div>
							<div class="flex flex-grow items-center justify-center p-1 text-xs font-bold">
								<span>POINTS</span>
							</div>
						</aside>
					</rubric-header>
					<rubric-body>
						<row>
							<aside class="min-w-42 max-w-42">
								<p class="text-sm font-bold">ENGINEERING DESIGN PROCESS</p>
								<p class="text-xs italic text-gray-500">All Awards</p>
							</aside>
							<scroll-container>
								<content class="min-w-120">
									<div>
										Team shows evidence of independent inquiry from the beginning stages of their design process. This includes
										brainstorming, testing, and exploring alternative solutions
									</div>
									<div>Team shows evidence of independent inquiry for some elements of their design process.</div>
									<div>Team shows little to no evidence of independent inquiry in their design process.</div>
								</content>
							</scroll-container>
							<aside class="flex-0! flex-col! items-stretch! min-w-14!">Score</aside>
						</row>
						<row>
							<aside class="min-w-42 max-w-42">
								<p class="text-sm font-bold">GAME STRATEGY</p>
								<p class="text-xs italic text-gray-500">Design, Innovate, Create, Amaze</p>
							</aside>
							<scroll-container>
								<content class="min-w-120">
									<div>
										Team shows evidence of independent inquiry from the beginning stages of their design process. This includes
										brainstorming, testing, and exploring alternative solutions
									</div>
									<div>Team shows evidence of independent inquiry for some elements of their design process.</div>
									<div>Team shows little to no evidence of independent inquiry in their design process.</div>
								</content>
							</scroll-container>
							<aside class="flex-0! flex-col! items-stretch! min-w-14!">Score</aside>
						</row>
					</rubric-body>
				</rubric-table>
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

	rubric-table {
		@apply flex flex-col;

		> :first-child {
			@apply border-t-3;
		}

		> * {
			@apply border-b-3;
		}

		scroll-container {
			@apply overflow-auto;

			> content {
				@apply flex flex-grow flex-row items-stretch justify-center text-left text-sm;

				> * {
					@apply flex-1 p-2;
				}

				> :not(:first-child) {
					@apply border-l-1;
				}
			}
		}

		aside {
			@apply flex flex-grow flex-col items-center justify-center p-2 text-center text-xs;
		}

		rubric-header {
			@apply flex flex-row;

			> :first-child {
				@apply border-l-3;
			}

			> * {
				@apply border-r-3 flex-grow;
			}
		}

		rubric-body {
			@apply flex flex-col;

			> :not(:first-child) {
				@apply border-t-1;
			}

			> row {
				@apply flex flex-row;

				> :first-child {
					@apply border-l-3;
				}

				> * {
					@apply border-r-3 flex-grow;
				}

				&:nth-child(even) {
					@apply bg-gray-100;
				}
			}
		}

		:not(:last-child) {
			> scroll-container {
				scrollbar-width: none;
			}
		}
	}
</style>
