<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardRankingsTab } from '$lib/tab.svelte';

	interface Props {
		tab: AwardRankingsTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Get data from app
	const essentialData = $derived(app.getEssentialData());
	const allTeams = $derived(app.getAllTeams());
	const allAwards = $derived(app.getAllAwards());
	const currentUser = $derived(app.getCurrentUser());

	// Local state
	let selectedAwardId = $state('');
	let teamRankings = $state<string[]>([]);
	let rankingNotes = $state('');

	// Get the selected award details
	const selectedAward = $derived(allAwards.find((award) => award.name === selectedAwardId));

	// Get eligible teams for the selected award
	const eligibleTeams = $derived(() => {
		if (!selectedAward) return [];
		return allTeams.filter((team) => {
			// Filter teams based on award criteria (accepted grades)
			if (selectedAward.acceptedGrades && !selectedAward.acceptedGrades.includes(team.grade)) {
				return false;
			}
			return true;
		});
	});

	// Initialize rankings when award selection changes
	$effect(() => {
		if (selectedAwardId && eligibleTeams().length > 0) {
			// Only initialize if rankings are empty or different award selected
			if (teamRankings.length === 0 || !eligibleTeams().some((team) => teamRankings.includes(team.id))) {
				teamRankings = eligibleTeams().map((team) => team.id);
			}
		}
	});

	function moveTeamUp(teamId: string) {
		const index = teamRankings.indexOf(teamId);
		if (index > 0) {
			const newRankings = [...teamRankings];
			[newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]];
			teamRankings = newRankings;
		}
	}

	function moveTeamDown(teamId: string) {
		const index = teamRankings.indexOf(teamId);
		if (index < teamRankings.length - 1) {
			const newRankings = [...teamRankings];
			[newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]];
			teamRankings = newRankings;
		}
	}

	function moveTeamToPosition(teamId: string, newPosition: number) {
		const currentIndex = teamRankings.indexOf(teamId);
		if (currentIndex === -1 || newPosition < 0 || newPosition >= teamRankings.length) return;

		const newRankings = [...teamRankings];
		newRankings.splice(currentIndex, 1);
		newRankings.splice(newPosition, 0, teamId);
		teamRankings = newRankings;
	}

	async function saveRankings() {
		if (!selectedAwardId || teamRankings.length === 0) {
			alert('Please select an award and rank teams');
			return;
		}

		// TODO: Implement actual save functionality via WRPC
		console.log('Saving award rankings:', {
			awardId: selectedAwardId,
			rankings: teamRankings,
			notes: rankingNotes
		});

		alert('Award rankings saved successfully! (This is a placeholder)');
	}

	function getTeamById(teamId: string) {
		return allTeams.find((team) => team.id === teamId);
	}

	function getRankSuffix(position: number): string {
		if (position % 100 >= 11 && position % 100 <= 13) {
			return 'th';
		}
		switch (position % 10) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	}
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Award Rankings</h2>
				<p class="mt-2 text-sm text-gray-600">Rank teams for specific awards based on judging criteria and performance.</p>
			</div>

			<!-- Award Selection -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Award Selection</h3>
				<div>
					<label for="award-select" class="block text-sm font-medium text-gray-700">Award</label>
					<select id="award-select" bind:value={selectedAwardId} class="classic mt-1 block w-full">
						<option value="">Select an award...</option>
						{#each allAwards as award (award.name)}
							<option value={award.name}>{award.name}</option>
						{/each}
					</select>
				</div>

				{#if selectedAward}
					<div class="mt-4 rounded-lg bg-blue-50 p-4">
						<h4 class="font-medium text-blue-900">Award Information</h4>
						<div class="mt-2 text-sm text-blue-800">
							<p><strong>Name:</strong> {selectedAward.name}</p>
							<p><strong>Type:</strong> {selectedAward.type}</p>
							<p><strong>Accepted Grades:</strong> {selectedAward.acceptedGrades.join(', ')}</p>
							<p><strong>Winners Count:</strong> {selectedAward.winnersCount}</p>
							<p><strong>Eligible Teams:</strong> {eligibleTeams().length}</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Team Rankings -->
			{#if selectedAwardId && eligibleTeams().length > 0}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-medium text-gray-900">Team Rankings</h3>
					<p class="mb-4 text-sm text-gray-600">Drag teams to reorder, or use the arrow buttons to adjust rankings.</p>

					<div class="space-y-3">
						{#each teamRankings as teamId, index (teamId)}
							{@const team = getTeamById(teamId)}
							{#if team}
								<div class="flex items-center space-x-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
									<!-- Position -->
									<div class="w-12 flex-shrink-0 text-center">
										<div class="text-lg font-bold text-gray-900">
											{index + 1}<span class="text-sm">{getRankSuffix(index + 1)}</span>
										</div>
									</div>

									<!-- Team Info -->
									<div class="flex-1">
										<div class="font-medium text-gray-900">
											Team #{team.number} - {team.name}
										</div>
										<div class="text-sm text-gray-500">
											{team.school} • {team.grade}
										</div>
									</div>

									<!-- Move Controls -->
									<div class="flex space-x-1">
										<button
											onclick={() => moveTeamUp(teamId)}
											disabled={index === 0}
											class="p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
											title="Move up"
											aria-label="Move team up"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
											</svg>
										</button>
										<button
											onclick={() => moveTeamDown(teamId)}
											disabled={index === teamRankings.length - 1}
											class="p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
											title="Move down"
											aria-label="Move team down"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
											</svg>
										</button>
									</div>

									<!-- Quick Position Jump -->
									<select
										value={index}
										onchange={(e) => moveTeamToPosition(teamId, parseInt((e.target as HTMLSelectElement).value))}
										class="rounded-md border border-gray-300 px-2 py-1 text-sm"
									>
										{#each teamRankings as _, pos}
											<option value={pos}>{pos + 1}</option>
										{/each}
									</select>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Ranking Justification -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-medium text-gray-900">Ranking Justification</h3>
					<textarea
						bind:value={rankingNotes}
						placeholder="Provide reasoning for the team rankings. Include criteria used, standout performances, and any additional considerations..."
						rows="6"
						class="classic block w-full"
					></textarea>
					<div class="mt-2 text-xs text-gray-500">Document the reasoning behind these rankings for transparency and future reference.</div>
				</div>

				<!-- Top 3 Summary -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-medium text-gray-900">Top 3 Teams</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						{#each teamRankings.slice(0, 3) as teamId, index (teamId)}
							{@const team = getTeamById(teamId)}
							{#if team}
								<div
									class="rounded-lg p-4 text-center"
									class:bg-yellow-50={index === 0}
									class:border-yellow-200={index === 0}
									class:bg-gray-50={index === 1}
									class:border-gray-200={index === 1}
									class:bg-orange-50={index === 2}
									class:border-orange-200={index === 2}
									class:border={true}
								>
									<div
										class="mb-2 text-2xl font-bold"
										class:text-yellow-600={index === 0}
										class:text-gray-600={index === 1}
										class:text-orange-600={index === 2}
									>
										{index + 1}{getRankSuffix(index + 1)}
									</div>
									<div class="font-medium text-gray-900">Team #{team.number}</div>
									<div class="text-sm text-gray-600">{team.name}</div>
									<div class="mt-1 text-xs text-gray-500">{team.school}</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Actions -->
				<div class="flex justify-end space-x-3">
					<button onclick={saveRankings} class="primary"> Save Rankings </button>
				</div>
			{:else if selectedAwardId && eligibleTeams().length === 0}
				<div class="rounded-lg bg-yellow-50 p-6">
					<div class="text-center text-yellow-800">
						<p class="font-medium">No eligible teams found</p>
						<p class="mt-1 text-sm">There are no teams that meet the criteria for this award.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</Tab>
