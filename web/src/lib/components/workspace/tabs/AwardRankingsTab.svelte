<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardRankingsTab } from '$lib/tab.svelte';

	interface Props {
		tab: AwardRankingsTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Award Rankings</h2>
				<p class="mt-2 text-sm text-gray-600">Rank teams for specific awards based on judging criteria and performance.</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-sm">
				{#if currentJudgeGroup}
					{@const currentJudgeGroupAwardRankings = subscriptions.allJudgeGroupsAwardRankings[currentJudgeGroup.id]}
					<table>
						<thead>
							<tr>
								<td></td>
								{#each currentJudgeGroupAwardRankings.judgedAwards as award}
									<td class="min-w-40 max-w-40 border p-2 text-center">{award}</td>
								{/each}
							</tr>
						</thead>
					</table>
				{/if}
			</div>
		</div>
	</div>
</Tab>
