<script lang="ts">
	import Tab from './Tab.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import { app } from '$lib/app-page.svelte';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { isExcellenceAward } from '@judging.jerryio/protocol/src/award';

	interface Props {
		tab: FinalAwardRankingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Create a team card component for drag and drop
	interface TeamCard extends AwardNomination {
		id: string; // Required by dndzone
	}

	const allAwards = $derived(app.getAllAwards());
	const allPerformanceAwards = $derived(allAwards.filter((award) => award.type === 'performance'));
	const allJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged' && !isExcellenceAward(award.name)));

	const allTeams = $derived(app.getAllTeamInfoAndData());
	const allSortedTeams = $derived(sortByTeamNumber(Object.values(allTeams)));
	// const eligibleTeams = $derived(Object.values(allTeams).filter((team) => !team.excluded));

	const allJudgeGroups = $derived(app.getAllJudgeGroupsInMap());

	const allFinalAwardNominations = $derived(app.getAllFinalAwardNominations());

	const allJudgedAwardNominations = $state({} as Record<string, TeamCard[]>);

	$effect(() => {
		for (const award of allJudgedAwards) {
			console.log('allJudgedAwardNominations', award.name, allFinalAwardNominations[award.name]);

			allJudgedAwardNominations[award.name] = nominationsToTeamCards(allFinalAwardNominations[award.name] || []);
		}
	});

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

	async function updateJudgedAwardNominations(awardName: string, nominations: AwardNomination[]) {
		try {
			await app.wrpcClient.judging.updateFinalRankings.mutation({
				awardName,
				nominations
			});
		} catch (error) {
			console.error('Failed to update judged award nominations:', error);
			app.addErrorNotice('Failed to update award nominations');
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

	function getTeamNumber(teamId: string) {
		const team = allTeams[teamId];
		return team ? team.number : 'Unknown Team';
	}

	// Drag and drop functionality for judged awards
	const flipDurationMs = 200;

	// Interface for drag and drop events
	interface DropEvent {
		detail: {
			items: TeamCard[];
			info: {
				trigger: string;
				source: string;
				id: string;
			};
		};
	}

	function handleJudgedAwardDrop(awardName: string, e: DropEvent) {
		allJudgedAwardNominations[awardName] = e.detail.items;
		updateJudgedAwardNominations(awardName, e.detail.items);
		console.log('handleJudgedAwardDrop', e);
	}

	function handleJudgedAwardConsider(awardName: string, e: DropEvent) {
		// Just update the local state during drag
		const {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		allJudgedAwardNominations[awardName] = newItems;
		console.log('handleJudgedAwardConsider', e, newItems);
	}

	function nominationsToTeamCards(nominations: AwardNomination[]): TeamCard[] {
		return nominations.map((nom, index) => ({
			...nom,
			id: nom.teamId
		}));
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
			<!-- TEST disable performance awards -->
			<div class="hidden rounded-lg bg-white p-6 shadow-sm">
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

								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
									{#each Array(award.winnersCount) as _, position}
										{@const nominations = allFinalAwardNominations[award.name] || []}
										{@const isDisabled = nominations.length < position}
										{@const currentSelection = nominations[position]?.teamId || ''}
										{@const availableTeams = getAvailableTeams(nominations, position)}
										<div class="space-y-1">
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

			<!-- Judged Awards -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-2 text-xl font-semibold text-gray-900">Judged Awards</h2>
				<p class="mb-6 text-sm text-gray-600">
					Judged Awards are determined by judges based on award criteria and rubrics. Drag and drop teams to reorder nominations.
				</p>

				{#if allJudgedAwards.length === 0}
					<div class="py-8 text-center">
						<p class="text-gray-500">No judged awards configured for this event.</p>
					</div>
				{:else}
					<div class="space-y-4 overflow-x-auto">
						<div class="flex flex-row gap-2">
							{#each allJudgedAwards as award}
								{@const teamCards = allJudgedAwardNominations[award.name] || []}
								<div class="min-w-35 flex flex-col gap-2">
									<div class="flex items-center justify-center p-2 text-center">
										{award.name}
									</div>
									<div>
										{#if teamCards.length > 0}
											<div
												class="border-1 flex flex-col gap-1 rounded-lg border-dashed border-gray-300 bg-gray-50 p-1"
												use:dndzone={{
													items: teamCards,
													flipDurationMs,
													dropTargetStyle: { outline: '0px solid #3B82F6' },
													type: award.name
												}}
												onconsider={(e) => handleJudgedAwardConsider(award.name, e)}
												onfinalize={(e) => handleJudgedAwardDrop(award.name, e)}
											>
												{#each teamCards as teamCard (teamCard.id)}
													<div
														animate:flip={{ duration: flipDurationMs }}
														class="cursor-move rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
													>
														<div class="flex items-center justify-between">
															<div class="flex items-center space-x-3">
																<div>
																	<p class="text-sm font-medium text-gray-900">
																		{getTeamNumber(teamCard.teamId)}
																	</p>
																	{#if teamCard.judgeGroupId}
																		<p class="text-xs text-gray-500">
																			by {allJudgeGroups[teamCard.judgeGroupId].name}
																		</p>
																	{/if}
																</div>
															</div>
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<div class="flex h-full min-h-10 items-center justify-center text-gray-500">
												<p class="text-sm">No nominations yet</p>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						<!-- {#each allJudgedAwards as award}
							{@const teamCards = allJudgedAwardNominations[award.name] || []}
							<div class="rounded-lg border border-gray-200 p-4">
								<div
									class="min-h-[80px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3"
									use:dndzone={{
										items: teamCards,
										flipDurationMs,
										dropTargetStyle: { outline: '2px solid #3B82F6' },
										type: award.name
									}}
									onconsider={(e) => handleJudgedAwardConsider(award.name, e)}
									onfinalize={(e) => handleJudgedAwardDrop(award.name, e)}
								>
									{#each teamCards as teamCard (teamCard.id)}
										<div
											animate:flip={{ duration: flipDurationMs }}
											class="mb-2 cursor-move rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
										>
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-3">
													<div>
														<p class="text-sm font-medium text-gray-900">
															{getTeamDisplayName(teamCard.teamId)}
														</p>
														{#if teamCard.judgeGroupId}
															<p class="text-xs text-gray-500">
																Judge Group: {allJudgeGroups[teamCard.judgeGroupId].name}
															</p>
														{/if}
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
								{#if teamCards.length === 0}
									<div class="flex h-full min-h-[60px] items-center justify-center text-gray-500">
										<p class="text-sm">No nominations yet</p>
									</div>
								{/if}
							</div>
						{/each} -->
					</div>
				{/if}
			</div>
		</div>
	</div>
</Tab>
