<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardRankingTab } from '$lib/tab.svelte';
	import './award-ranking.css';
	import AwardRankingTable from './AwardRankingTable.svelte';

	interface Props {
		tab: AwardRankingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Filter states
	let showExcludedTeams = $state(false); // Default checked
	let bypassAwardRequirements = $state(false);

	const judgeGroups = $derived(app.getAllJudgeGroupsInMap());
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

				<!-- Filter Options -->
				<div class="mt-4 flex flex-wrap gap-4">
					<label class="flex items-center">
						<input
							type="checkbox"
							bind:checked={showExcludedTeams}
							class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span class="text-sm text-gray-700">Show excluded teams</span>
					</label>

					<label class="flex items-center">
						<input
							type="checkbox"
							bind:checked={bypassAwardRequirements}
							class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span class="text-sm text-gray-700">Bypass award requirement checks</span>
					</label>
				</div>
			</div>

			{#each Object.values(subscriptions.allJudgeGroupsAwardRankings) as awardRankings}
				{@const judgeGroup = judgeGroups[awardRankings.judgeGroupId]}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<AwardRankingTable title={judgeGroup.name} {judgeGroup} showingTeams={{ showExcludedTeams }} {bypassAwardRequirements} />
				</div>
			{/each}

			<!--  -->
		</div>
	</div>
</Tab>
