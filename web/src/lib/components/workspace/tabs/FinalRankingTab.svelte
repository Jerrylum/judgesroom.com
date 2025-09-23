<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import Tab from './Tab.svelte';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import { isExcellenceAward, type Award } from '@judging.jerryio/protocol/src/award';
	import FinalRankingColumn from './FinalRankingColumn.svelte';
	import { tick } from 'svelte';

	interface Props {
		tab: FinalAwardRankingTab;
		isActive: boolean;
	}

	// Interface for drag and drop events
	interface DropEvent {
		detail: {
			items: AwardNomination[];
		};
	}

	let { tab, isActive }: Props = $props();

	const allAwards = $derived(app.getAllAwards());
	const allPerformanceAwards = $derived(allAwards.filter((award) => award.type === 'performance'));
	const allExcellenceAwards = $derived(allAwards.filter((award) => isExcellenceAward(award.name)));
	const allRemainingJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged' && !isExcellenceAward(award.name)));

	const allTeams = $derived(app.getAllTeamInfoAndData());
	const allSortedTeams = $derived(sortByTeamNumber(Object.values(allTeams)));
	// const eligibleTeams = $derived(Object.values(allTeams).filter((team) => !team.excluded));

	const allJudgeGroups = $derived(app.getAllJudgeGroupsInMap());

	let allFinalAwardNominations = $state<Readonly<Record<string, Readonly<AwardNomination>[]>>>({});

	$effect(() => {
		// Just like using derived, this will update the allFinalAwardNominations state when the app.getAllFinalAwardNominations state changes
		allFinalAwardNominations = app.getAllFinalAwardNominations();
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

	let dropOut = $state<{ awardName: string; nominations: AwardNomination[] } | null>(null);
	let dragIn = $state<{ awardName: string; nominations: AwardNomination[] } | null>(null);

	function isFinalRankingValid(awardName: string, nominations: AwardNomination[]): boolean {
		const award = allAwards.find((a) => a.name === awardName);

		if (!award) {
			console.error('CRITICAL: Award not found');
			return false;
		}

		return nominations.every((nom) => {
			const team = allTeams[nom.teamId];

			return award.acceptedGrades.includes(team.grade);
		});
	}

	function rollbackJudgedAwardNominations() {
		// force all columns to rollback their editing state
		// IMPORTANT: to avoid rendering warnings, we need to wait for the next tick
		tick().then(() => {
			allFinalAwardNominations = app.getAllFinalAwardNominations();
		});
	}

	async function handleJudgedAwardDrop(award: Award, zone: string, e: DropEvent) {
		if (zone === 'Design Award') {
			const originalState = allFinalAwardNominations[award.name] || [];
			const proposedState = e.detail.items;
			if (originalState.length === proposedState.length) {
				if (isFinalRankingValid(award.name, e.detail.items)) {
					await updateJudgedAwardNominations(award.name, e.detail.items);
				} else {
					rollbackJudgedAwardNominations();
				}
				return;
			} else if (originalState.length > proposedState.length) {
				dropOut = { awardName: award.name, nominations: proposedState };
			} else {
				dragIn = { awardName: award.name, nominations: proposedState };
			}

			if (dropOut && dragIn) {
				if (isFinalRankingValid(dragIn.awardName, dragIn.nominations) && isFinalRankingValid(dropOut.awardName, dropOut.nominations)) {
					await updateJudgedAwardNominations(dragIn.awardName, dragIn.nominations);
					await updateJudgedAwardNominations(dropOut.awardName, dropOut.nominations);
				} else {
					rollbackJudgedAwardNominations();
				}
				dropOut = null;
				dragIn = null;
			}
		} else {
			updateJudgedAwardNominations(award.name, e.detail.items);
		}
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

				<div class="relative space-y-4 overflow-x-auto">
					<div class="flex flex-col gap-2">
						<div class="flex flex-row gap-2">
							{#each allExcellenceAwards as award (award.name)}
								<FinalRankingColumn
									{award}
									zone="Design Award"
									{allTeams}
									{allJudgeGroups}
									{allFinalAwardNominations}
									onDrop={handleJudgedAwardDrop}
									showFullAwardName
								/>
							{/each}
						</div>
						<div class="flex flex-row gap-2">
							{#each allRemainingJudgedAwards as award (award.name)}
								<FinalRankingColumn {award} {allTeams} {allJudgeGroups} {allFinalAwardNominations} onDrop={handleJudgedAwardDrop} />
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</Tab>
