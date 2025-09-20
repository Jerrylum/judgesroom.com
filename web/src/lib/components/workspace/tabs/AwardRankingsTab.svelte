<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardRankingsTab } from '$lib/tab.svelte';
	import './award-ranking.css';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';
	import AwardRankingsTable from './AwardRankingsTable.svelte';

	interface Props {
		tab: AwardRankingsTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const teams = $derived(app.getAllTeamInfoAndData());

	const judgeGroups = $derived(app.getAllJudgeGroupsInMap());

	function getListingTeams(judgeGroupId: string) {
		const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[judgeGroupId] ?? [];
		const assignedTeams = judgeGroups[judgeGroupId].assignedTeams;
		const allTeams = [...reviewedTeams, ...assignedTeams];
		const uniqueTeams = new Set(allTeams);
		return sortByTeamNumberInMap(Array.from(uniqueTeams), teams);
	}
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Award Candidate Ranking</h2>
				<p class="mt-2 text-sm text-gray-600">
					Click on any ranking cell, then use the minus (-) and plus (+) buttons to adjust rankings to indicate teams that are strong
					candidates for awards. All judge groups will cross-reference their lists to create a final award nomination list. This table is
					shared and synchronized within your judge group - all judges see updates in real-time without needing to refresh the page.
				</p>
			</div>

			{#each Object.entries(subscriptions.allJudgeGroupsAwardRankings) as [judgeGroupId, awardRankings]}
				{@const judgeGroup = judgeGroups[judgeGroupId]}
				{@const listingTeams = getListingTeams(judgeGroupId)}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">{judgeGroup.name}</h3>
					<AwardRankingsTable {listingTeams} {awardRankings} />
				</div>
			{/each}

			<!--  -->
		</div>
	</div>
</Tab>
