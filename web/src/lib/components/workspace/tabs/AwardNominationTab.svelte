<script lang="ts">
	import { app, tabs } from '$lib/index.svelte';
	import { FinalAwardRankingTab, type AwardNominationTab } from '$lib/tab.svelte';
	import './award-ranking.css';
	import AwardNominationTable from './AwardNominationTable.svelte';

	interface Props {
		tab: AwardNominationTab;
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
			<h2 class="text-xl font-semibold text-gray-900">Award Nominations</h2>
			<p class="mt-2 text-sm text-gray-600">
				After judge groups complete their team interviews, each group selects their top one or two candidates from their interviewed teams
				for each award. Judge groups should share their nominations to create a shortlist for each award. When there are many nominations,
				the Judge Advisor may ask groups to withdraw weaker candidates based on brief arguments comparing the merits of each nomination
				against award criteria.
			</p>
			<p class="mt-2 text-sm text-gray-600">
				Excellence Award winners are selected from Design Award finalists. Nominate teams for each award first, then go to <button
					class="text-blue-500 hover:text-blue-600"
					onclick={() => tabs.addOrReuseTab(new FinalAwardRankingTab())}>Final Ranking</button
				> tab to determine the winners.
			</p>

			<!-- Filter Options -->
			<div class="mt-4 flex flex-wrap gap-4">
				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={showAbsentTeams}
						class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span class="text-sm text-gray-700">Show absent teams</span>
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

		{#each Object.keys(judgeGroups) as judgeGroupId}
			{@const judgeGroup = judgeGroups[judgeGroupId]}
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<AwardNominationTable title={judgeGroup.name} {judgeGroup} {showAbsentTeams} {bypassAwardRequirements} />
			</div>
		{/each}
	</div>
</div>
