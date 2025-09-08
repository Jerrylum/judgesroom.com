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
	const judgeGroups = $derived(app.getJudgeGroups());
	const currentUser = $derived(app.getCurrentUser());

	// Local state for the rubric form
	let selectedTeamId = $state(tab.teamId || '');
	let selectedJudgeGroupId = $state(tab.judgeGroupId || '');
	let interviewNotes = $state('');
	let rubricScores = $state<Record<string, number>>({});

	// Get the selected team details
	const selectedTeam = $derived(allTeams.find(team => team.id === selectedTeamId));

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
			rubricCriteria.forEach(criteria => {
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
			judgeGroupId: selectedJudgeGroupId,
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
	<div class="mx-auto max-w-4xl space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-gray-900">Team Interview Rubric</h2>
			<p class="mt-2 text-sm text-gray-600">
				Evaluate team performance during the interview process.
			</p>
		</div>

		<!-- Team Selection -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Team Selection</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label for="team-select" class="block text-sm font-medium text-gray-700">Team</label>
					<select id="team-select" bind:value={selectedTeamId} class="classic mt-1 block w-full">
						<option value="">Select a team...</option>
						{#each allTeams as team (team.id)}
							<option value={team.id}>{team.number} - {team.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="judge-group-select" class="block text-sm font-medium text-gray-700">Judge Group</label>
					<select id="judge-group-select" bind:value={selectedJudgeGroupId} class="classic mt-1 block w-full">
						<option value="">Select judge group...</option>
						{#each judgeGroups as group (group.id)}
							<option value={group.id}>{group.name}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if selectedTeam}
				<div class="mt-4 rounded-lg bg-blue-50 p-4">
					<h4 class="font-medium text-blue-900">Team Information</h4>
					<div class="mt-2 text-sm text-blue-800">
					<p><strong>Team #{selectedTeam.number}:</strong> {selectedTeam.name}</p>
					<p><strong>School:</strong> {selectedTeam.school}</p>
					<p><strong>Grade Level:</strong> {selectedTeam.grade}</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Rubric Scoring -->
		{#if selectedTeamId}
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Scoring Rubric</h3>
				<div class="space-y-6">
					{#each rubricCriteria as criteria (criteria.id)}
						<div class="border-b border-gray-200 pb-6 last:border-b-0">
							<div class="flex items-center justify-between mb-2">
								<h4 class="font-medium text-gray-900">{criteria.name}</h4>
								<div class="text-sm text-gray-500">
									{rubricScores[criteria.id] || 0} / {criteria.maxScore}
								</div>
							</div>
							<p class="text-sm text-gray-600 mb-3">{criteria.description}</p>
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
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<span class="text-lg font-medium text-gray-900">Total Score</span>
							<span class="text-xl font-bold text-blue-600">
								{totalScore()} / {maxTotalScore()}
							</span>
						</div>
						<div class="mt-2">
							<div class="w-full bg-gray-200 rounded-full h-2">
								<div 
									class="bg-blue-600 h-2 rounded-full transition-all duration-300"
									style="width: {(totalScore() / maxTotalScore()) * 100}%"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Interview Notes -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Interview Notes</h3>
				<textarea
					bind:value={interviewNotes}
					placeholder="Enter detailed notes about the team's interview performance..."
					rows="6"
					class="classic block w-full"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex justify-end space-x-3">
				<button onclick={saveRubric} class="primary">
					Save Rubric
				</button>
			</div>
		{/if}
	</div>
</div>
</Tab>
