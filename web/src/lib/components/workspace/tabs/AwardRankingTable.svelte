<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import RankingButtons from './RankingButtons.svelte';
	import type { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';

	interface Props {
		title: string;
		judgeGroup: JudgeGroup;
		showingTeams: { targetTeams: string[] } | { showExcludedTeams: boolean };
		bypassAwardRequirements: boolean;
	}

	let { title, judgeGroup, showingTeams, bypassAwardRequirements }: Props = $props();

	const awards = $derived(app.getAllAwardsInMap());
	const teams = $derived(app.getAllTeamInfoAndData());

	// This assume that the award rankings are subscribed to
	const awardRankings = $derived(subscriptions.allJudgeGroupsAwardRankings[judgeGroup.id]);

	const listingTeams = $derived.by(() => {
		if ('targetTeams' in showingTeams) {
			return showingTeams.targetTeams;
		}
		const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[judgeGroup.id] ?? [];
		const assignedTeams = judgeGroup.assignedTeams;
		const allTeams = [...reviewedTeams, ...assignedTeams];
		const uniqueTeams = new Set(allTeams);
		const teamIds = Array.from(uniqueTeams);

		// Filter by excluded teams if showExcludedTeams is false
		const filteredTeams = showingTeams.showExcludedTeams ? teamIds : teamIds.filter((teamId) => !teams[teamId]?.excluded);

		return sortByTeamNumberInMap(filteredTeams, teams);
	});

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();
</script>

<div class="flex flex-row items-center justify-between">
	<h3 class="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
	<div class="mb-2 flex flex-row justify-end gap-2 text-sm">
		<button class="lightweight tiny" onclick={scrollLeft}>Scroll Left</button>
		<button class="lightweight tiny" onclick={scrollRight}>Scroll Right</button>
	</div>
</div>
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
			{@const team = teams[teamId]}
			<row>
				<team>{team.number}</team>
				<scroll-container use:registerScrollContainer>
					<content>
						{#each awardRankings.judgedAwards as _, awardIndex}
							{@const award = awards[awardRankings.judgedAwards[awardIndex]]}
							<RankingButtons
								{awardIndex}
								{awardRankings}
								{award}
								{team}
								judgeGroupId={awardRankings.judgeGroupId}
								{bypassAwardRequirements}
							/>
						{/each}
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</award-rankings-table>
