<script lang="ts">
	import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';
	import { app } from '$lib/app-page.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import RankingButtons from './RankingButtons.svelte';

	interface Props {
		listingTeams: string[];
		awardRankings: AwardRankingsFullUpdate;
	}

	let { listingTeams, awardRankings }: Props = $props();

	const teams = $derived(app.getAllTeamInfoAndData());

	const { registerScrollContainer } = scrollSync();
</script>

<award-rankings-table>
	<table-header>
		<team>TEAM NUMBER</team>
		<scroll-container use:registerScrollContainer class="bg-gray-200">
			<content>
				{#each awardRankings.judgedAwards as award}
					<div class="flex min-h-14 min-w-40 max-w-40 items-center justify-center p-2 text-center">{award}</div>
				{/each}
			</content>
		</scroll-container>
	</table-header>
	<table-body>
		{#each listingTeams as teamId}
			<row>
				<team>{teams[teamId].number}</team>
				<scroll-container use:registerScrollContainer>
					<content>
						{#each awardRankings.judgedAwards as _, awardIndex}
							<RankingButtons judgeGroupId={awardRankings.judgeGroupId} {teamId} {awardIndex} {awardRankings} />
						{/each}
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</award-rankings-table>
