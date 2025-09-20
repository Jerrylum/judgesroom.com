<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardNominationTab } from '$lib/tab.svelte';
	import './award-ranking.css';
	import AwardNominationTable from './AwardNominationTable.svelte';

	interface Props {
		tab: AwardNominationTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const judgeGroups = $derived(app.getAllJudgeGroupsInMap());
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Award Nominations</h2>
				<p class="mt-2 text-sm text-gray-600">TODO</p>
			</div>

			{#each Object.keys(judgeGroups) as judgeGroupId}
				{@const judgeGroup = judgeGroups[judgeGroupId]}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">{judgeGroup.name}</h3>
					<AwardNominationTable {judgeGroupId} />
				</div>
			{/each}
		</div>
	</div>
</Tab>
