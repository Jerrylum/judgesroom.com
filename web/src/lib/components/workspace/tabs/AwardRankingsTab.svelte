<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardRankingsTab } from '$lib/tab.svelte';
	import './award-ranking.css';

	interface Props {
		tab: AwardRankingsTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Scroll container references for synchronization
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;
	let mainScrollContainer: HTMLElement;

	const currentJudgeGroup = $derived(app.getCurrentUserJudgeGroup());

	// Synchronize scroll positions across all containers
	function syncScrollPosition(sourceContainer: HTMLElement) {
		if (isSyncing) return; // Prevent infinite loop

		isSyncing = true;
		const scrollLeft = sourceContainer.scrollLeft;

		scrollContainers.forEach((container) => {
			if (container !== sourceContainer) {
				container.scrollLeft = scrollLeft;
			}
		});

		// Use setTimeout to reset the flag after all scroll events have been processed
		setTimeout(() => {
			isSyncing = false;
		}, 0);
	}

	// Register scroll container and add event listener
	function registerScrollContainer(container: HTMLElement) {
		if (!scrollContainers.includes(container)) {
			scrollContainers.push(container);
			container.addEventListener('scroll', () => syncScrollPosition(container));
		}
	}
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
					<award-ranking-table>
						<table-header>
							<team>TEAM NUMBER</team>
							<scroll-container use:registerScrollContainer>
								<content class="justify-start! flex-row!">
									{#each currentJudgeGroupAwardRankings.judgedAwards as award}
										<div class="flex min-h-14 min-w-40 max-w-40 items-center justify-center bg-gray-200 p-2 text-center">{award}</div>
									{/each}
								</content>
							</scroll-container>
						</table-header>
						<table-body>
							{#each Object.entries(currentJudgeGroupAwardRankings.rankings) as [teamId, rankings]}
								<row>
									<team>{teamId}</team>
									{#each rankings as ranking}
										<div class="min-w-40 max-w-40 border p-2 text-center">{ranking}</div>
									{/each}
								</row>
							{/each}
						</table-body>
					</award-ranking-table>
				{/if}
			</div>
		</div>
	</div>
</Tab>
