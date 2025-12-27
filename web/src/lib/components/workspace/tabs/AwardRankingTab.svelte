<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, subscriptions } from '$lib/index.svelte';
	import type { AwardRankingTab } from '$lib/tab.svelte';
	import './award-ranking.css';
	import AwardRankingTable from './AwardRankingTable.svelte';

	interface Props {
		tab: AwardRankingTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Filter states
	let showAbsentTeams = $state(false); // Default checked
	let bypassAwardRequirements = $state(false);

	const judgeGroups = $derived(app.getAllJudgeGroupsInMap());
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-gray-900">{m.award_candidate_ranking()}</h2>
			<p class="mt-2 text-sm text-gray-600">
				{m.award_candidate_ranking_description()}
			</p>

			<!-- Filter Options -->
			<div class="mt-4 flex flex-wrap gap-4">
				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={showAbsentTeams}
						class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span class="text-sm text-gray-700">{m.show_absent_teams()}</span>
				</label>

				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={bypassAwardRequirements}
						class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span class="text-sm text-gray-700">{m.bypass_award_requirement_checks()}</span>
				</label>
			</div>
		</div>

		{#each Object.values(subscriptions.allJudgeGroupsAwardRankings) as awardRankings}
			{@const judgeGroup = judgeGroups[awardRankings.judgeGroupId]}
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<AwardRankingTable title={judgeGroup.name} {judgeGroup} showingTeams={{ showAbsentTeams }} {bypassAwardRequirements} />
			</div>
		{/each}

		<!--  -->
	</div>
</div>
