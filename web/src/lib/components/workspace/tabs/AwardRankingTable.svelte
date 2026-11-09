<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, subscriptions } from '$lib/index.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import RankingButtons from './RankingButtons.svelte';
	import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';

	interface Props {
		title: string;
		judgeGroup: JudgeGroup;
		showingTeams: { targetTeams: string[] } | { showAbsentTeams: boolean };
		bypassAwardRequirements: boolean;
	}

	let { title, judgeGroup, showingTeams, bypassAwardRequirements }: Props = $props();

	const awards = $derived(app.getAllAwardsInMap());
	const teams = $derived(app.getAllTeamInfoAndData());
	const groupJudgeNames = $derived((app.getExistingJudgesGroupedByGroup()[judgeGroup.id] ?? []).map((judge) => judge.name).join(', '));

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

		// Filter by absent teams if showAbsentTeams is false
		const filteredTeams = showingTeams.showAbsentTeams ? teamIds : teamIds.filter((teamId) => !teams[teamId]?.absent);

		return sortByTeamNumberInMap(filteredTeams, teams);
	});

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();
</script>

<div class="flex flex-row items-start justify-between gap-4">
	<div class="mb-2 min-w-0">
		<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
		{#if title && groupJudgeNames}
			<p class="mt-1 text-sm text-gray-600">{groupJudgeNames}</p>
		{/if}
	</div>
	<div class="mb-2 flex shrink-0 flex-row justify-end gap-2 text-sm">
		<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
		<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
	</div>
</div>
<award-rankings-table>
	<table-header>
		<team>{m.team_number()}</team>
		<scroll-container use:registerScrollContainer class="bg-gray-200">
			<content>
				{#each awardRankings.judgedAwards as award (award)}
					<div class="flex min-h-14 max-w-40 min-w-40 items-center justify-center p-2 text-center">{award}</div>
				{/each}
			</content>
		</scroll-container>
	</table-header>
	<table-body>
		{#each listingTeams as teamId (teamId)}
			{@const team = teams[teamId]}
			<row>
				<team>{team.number}</team>
				<scroll-container use:registerScrollContainer>
					<content>
						{#each awardRankings.judgedAwards as awardName, awardIndex (awardName)}
							{@const award = awards[awardName]}
							<!-- The event setup has been updated and an award is removed, but the award rankings are not updated yet -->
							{#if award !== undefined}
								<RankingButtons
									{awardIndex}
									{awardRankings}
									{award}
									{team}
									judgeGroupId={awardRankings.judgeGroupId}
									{bypassAwardRequirements}
								/>
							{/if}
						{/each}
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</award-rankings-table>
