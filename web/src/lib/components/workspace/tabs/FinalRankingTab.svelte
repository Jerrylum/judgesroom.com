<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import { isExcellenceAward, type Award } from '@judging.jerryio/protocol/src/award';
	import FinalRankingColumn from './FinalRankingColumn.svelte';
	import { tick } from 'svelte';
	import { getJudgedAwardWinners } from '$lib/award.svelte';

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
	const allJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged'));
	const allExcellenceAwards = $derived(allAwards.filter((award) => isExcellenceAward(award.name)));
	const allRemainingJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged' && !isExcellenceAward(award.name)));

	const allTeams = $derived(app.getAllTeamInfoAndData());

	const allJudgeGroups = $derived(app.getAllJudgeGroupsInMap());

	let allFinalAwardNominations = $state<Readonly<Record<string, Readonly<AwardNomination>[]>>>({});

	$effect(() => {
		// Just like using derived, this will update the allFinalAwardNominations state when the app.getAllFinalAwardNominations state changes
		allFinalAwardNominations = app.getAllFinalAwardNominations();
	});

	const allFinalAwardWinners = $derived(getJudgedAwardWinners(allJudgedAwards, allFinalAwardNominations));

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
			if (isFinalRankingValid(award.name, e.detail.items)) {
				await updateJudgedAwardNominations(award.name, e.detail.items);
			} else {
				rollbackJudgedAwardNominations();
			}
		}
	}

	async function handleAddNomination(awardName: string, teamId: string) {
		await app.wrpcClient.judging.nominateFinalAward.mutation({ awardName, teamId, judgeGroupId: null });
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Judged Awards -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-2 text-xl font-semibold text-gray-900">Final Ranking</h2>
			<p class="mb-2 text-sm text-gray-600">
				Create the final ranking of award winners from nominated teams. After follow-up interviews are completed, judges who conducted those
				interviews should deliberate and rank nominees for each award. It's best practice to have first-choice winners plus three or more
				alternate candidates. Drag and drop teams to reorder nominations.
			</p>
			<p class="mb-2 text-sm text-gray-600">
				Excellence Award winners are selected from Design Award finalists who also meet Performance Award criteria, which may result in
				reshuffling other award winners to maintain the one-judged-award-per-team rule. Drag team(s) from the Design Award column to the Excellence Award column(s) to designate Excellence Award winner(s).
			</p>
			<p class="mb-6 text-sm text-gray-600">
				Winning teams for each award are marked by green.
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
								onFinalize={handleJudgedAwardDrop}
								showFullAwardName
								dropFromOthersDisabled={allFinalAwardNominations[award.name]?.length >= award.winnersCount}
								winners={allFinalAwardWinners[award.name]}
							/>
						{/each}
					</div>
					<div class="flex flex-row gap-2">
						{#each allRemainingJudgedAwards as award (award.name)}
							<FinalRankingColumn
								{award}
								{allTeams}
								{allJudgeGroups}
								{allFinalAwardNominations}
								onFinalize={handleJudgedAwardDrop}
								onAddNomination={handleAddNomination}
								showAddButton={true}
								winners={allFinalAwardWinners[award.name]}
							/>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
