<script lang="ts">
	import Tab from './Tab.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import { app } from '$lib/app-page.svelte';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import { sortByTeamNumber } from '$lib/team.svelte';

	interface Props {
		tab: FinalAwardRankingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const allAwards = $derived(app.getAllAwards());
	const allPerformanceAwards = $derived(allAwards.filter((award) => award.type === 'performance'));

	const allTeams = $derived(app.getAllTeamInfoAndData());
	const allSortedTeams = $derived(sortByTeamNumber(Object.values(allTeams)));
	// const eligibleTeams = $derived(Object.values(allTeams).filter((team) => !team.excluded));

	const allFinalAwardNominations = $derived(app.getAllFinalAwardNominations());

	async function updatePerformanceAward(awardName: string, position: number, teamId: string) {
		try {
			let nominations = allFinalAwardNominations[awardName] || [];
			if (teamId === '') {
				delete nominations[position];
			} else {
				nominations[position] = { teamId, judgeGroupId: null };
			}

			await app.wrpcClient.judging.updateFinalRankings.mutation({
				awardName,
				nominations: nominations.filter((nom) => nom.teamId !== '') // IMPORTANT
			});
		} catch (error) {
			console.error('Failed to update final rankings:', error);
			app.addErrorNotice('Failed to update award selections');
		}
	}

	function getAvailableTeams(nominations: AwardNomination[], pos: number) {
		const excludedTeamIds = nominations.slice(0, pos).map((nom) => nom.teamId);
		return allSortedTeams.filter((team) => !excludedTeamIds.includes(team.id));
	}

	// Get team display name
	function getTeamDisplayName(teamId: string) {
		const team = allTeams[teamId];
		return team ? `${team.number} - ${team.name}` : 'Unknown Team';
	}
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Final Ranking</h2>
				<p class="mt-2 text-sm text-gray-600">TODO</p>
			</div>

			<!-- Performance Awards -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Performance Awards</h2>
				<p class="mb-6 text-sm text-gray-600">
					Performance Awards are based on robot performance on the competition field in match play and Skills Challenges. These awards do
					not impact a team's eligibility to earn a Judged Award.
				</p>

				{#if allPerformanceAwards.length === 0}
					<div class="py-8 text-center">
						<p class="text-gray-500">No performance awards configured for this event.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each allPerformanceAwards as award}
							<div class="rounded-lg border border-gray-200 p-4">
								<div class="mb-2 flex items-center justify-between">
									<h3 class="text-lg font-semibold text-gray-900">{award.name}</h3>
									<span class="text-sm text-gray-500">
										{award.winnersCount} winner{award.winnersCount > 1 ? 's' : ''}
									</span>
								</div>

								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
									{#each Array(award.winnersCount) as _, position}
										{@const nominations = allFinalAwardNominations[award.name] || []}
										{@const isDisabled = nominations.length < position}
										{@const currentSelection = nominations[position]?.teamId || ''}
										{@const availableTeams = getAvailableTeams(nominations, position)}
										<div class="space-y-1">
											<!-- <label for={`award-${award.name}-position-${position}`} class="mb-2 block text-sm font-medium text-gray-700">
												{award.winnersCount === 1 ? 'Winner' : `Team ${position + 1}`}
											</label> -->
											<select
												id={`award-${award.name}-position-${position}`}
												disabled={isDisabled}
												value={currentSelection}
												onchange={(e) => updatePerformanceAward(award.name, position, (e.target as HTMLSelectElement).value)}
												class="classic mt-1 block w-full disabled:opacity-50"
											>
												<option value="">Select {award.winnersCount === 1 ? 'winner' : `team ${position + 1}`}...</option>
												{#if currentSelection && !availableTeams.find((t) => t.id === currentSelection)}
													<!-- Show currently selected team even if it would normally be filtered out -->
													<option value={currentSelection}>{getTeamDisplayName(currentSelection)}</option>
												{/if}
												{#each availableTeams as team}
													<option value={team.id}>{getTeamDisplayName(team.id)}</option>
												{/each}
											</select>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</Tab>
