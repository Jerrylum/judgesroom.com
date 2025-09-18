<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { AwardRankingsTab } from '$lib/tab.svelte';
	import './award-ranking.css';
	import type { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';

	interface Props {
		tab: AwardRankingsTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const teams = $derived(app.getAllTeamInfoAndData());

	const judgeGroups = $derived(
		app.getJudgeGroups().reduce(
			(acc, group) => {
				acc[group.id] = group;
				return acc;
			},
			{} as Record<string, JudgeGroup>
		)
	);

	// Scroll container references for synchronization
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

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
				<h2 class="text-xl font-semibold text-gray-900">Initial Award Candidate Ranking</h2>
				<p class="mt-2 text-sm text-gray-600">Rank teams for specific awards based on judging criteria and performance.</p>
			</div>

			{#each Object.entries(subscriptions.allJudgeGroupsAwardRankings) as [judgeGroupId, awardRankings]}
				{@const judgeGroup = judgeGroups[judgeGroupId]}
				{@const listingTeams = getListingTeams(judgeGroupId)}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">{judgeGroup.name}</h3>
					<award-rankings-table>
						<table-header>
							<team>TEAM NUMBER</team>
							<scroll-container use:registerScrollContainer>
								<content class="justify-start! flex-row!">
									{#each awardRankings.judgedAwards as award}
										<div class="flex min-h-14 min-w-40 max-w-40 items-center justify-center bg-gray-200 p-2 text-center">{award}</div>
									{/each}
								</content>
							</scroll-container>
						</table-header>
						<table-body>
							{#each listingTeams as teamId}
								{@const rankings = awardRankings.rankings[teamId] ?? Array(awardRankings.judgedAwards.length).fill(0)}
								{@const team = teams[teamId]}
								<row>
									<team>{team.number}</team>
									<scroll-container use:registerScrollContainer>
										<content class="justify-start! flex-row!">
											{#each rankings as ranking}
												<div class="min-w-40 max-w-40 p-2 text-center">{ranking}</div>
											{/each}
										</content>
									</scroll-container>
								</row>
							{/each}
						</table-body>
					</award-rankings-table>
				</div>
			{/each}

			<!--  -->
		</div>
	</div>
</Tab>
