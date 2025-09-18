<script lang="ts">
	import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';
	import { app } from '$lib/app-page.svelte';
	import RankingButtons from './RankingButtons.svelte';

	interface Props {
		listingTeams: string[];
		awardRankings: AwardRankingsFullUpdate;
	}

	let { listingTeams, awardRankings }: Props = $props();

	const teams = $derived(app.getAllTeamInfoAndData());

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
</script>

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
			<row>
				<team>{teams[teamId].number}</team>
				<scroll-container use:registerScrollContainer>
					<content class="justify-start! flex-row!">
						{#each awardRankings.judgedAwards as _, awardIndex}
							<RankingButtons judgeGroupId={awardRankings.judgeGroupId} {teamId} {awardIndex} {awardRankings} />
						{/each}
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</award-rankings-table>
