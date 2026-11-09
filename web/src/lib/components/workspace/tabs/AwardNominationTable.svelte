<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, subscriptions } from '$lib/index.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import NominationButtons from './NominationButtons.svelte';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';
	import { formatGradeMark, getPairedExcellenceAwardName, isDesignAward } from '@judgesroom.com/protocol/src/award';
	import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';
	import type { AwardRankingsFullUpdate } from '@judgesroom.com/protocol/src/rubric';

	interface Props {
		title: string;
		judgeGroup: JudgeGroup;
		showAbsentTeams: boolean;
		bypassAwardRequirements: boolean;
	}

	let { title, judgeGroup, showAbsentTeams, bypassAwardRequirements }: Props = $props();

	const awards = $derived(app.getAllAwardsInMap());
	const teams = $derived(app.getAllTeamInfoAndData());
	const isBlendedEvent = $derived(app.getEssentialData()?.eventGradeLevel === 'Blended');
	const groupJudgeNames = $derived((app.getExistingJudgesGroupedByGroup()[judgeGroup.id] ?? []).map((judge) => judge.name).join(', '));
	const finalAwardNominations = $derived(app.getAllFinalAwardNominations());
	const awardRankings = $derived(subscriptions.allJudgeGroupsAwardRankings[judgeGroup.id]) as AwardRankingsFullUpdate | undefined;

	// Teams that have completed a team interview (have at least one tiId in submission caches)
	const teamsWithTeamInterview = $derived.by(() => {
		const teamIds = new Set<string>();
		for (const cache of Object.values(subscriptions.allSubmissionCaches)) {
			if (cache.tiId) {
				teamIds.add(cache.teamId);
			}
		}
		return teamIds;
	});

	const listingTeams = $derived.by(() => {
		const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[judgeGroup.id] ?? [];
		const assignedTeams = judgeGroup.assignedTeams;
		const allTeams = [...reviewedTeams, ...assignedTeams];
		const uniqueTeams = new Set(allTeams);
		const teamIds = Array.from(uniqueTeams);

		// Filter by absent teams if showAbsentTeams is false
		const filteredTeams = showAbsentTeams ? teamIds : teamIds.filter((teamId) => !teams[teamId]?.absent);

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
{#if awardRankings}
	<award-rankings-table class={{ 'with-team-grade': isBlendedEvent }}>
		<table-header>
			<team>{m.team_number()}</team>
			<scroll-container use:registerScrollContainer class="bg-gray-200">
				<content>
					{#each awardRankings.judgedAwards as award (award)}
						{#if isDesignAward(award)}
							<div class="flex min-h-14 max-w-40 min-w-40 items-center justify-center p-2 text-center">
								{award} / {getPairedExcellenceAwardName(award)}
							</div>
						{:else}
							<div class="flex min-h-14 max-w-40 min-w-40 items-center justify-center p-2 text-center">{award}</div>
						{/if}
					{/each}
				</content>
			</scroll-container>
		</table-header>
		<table-body>
			{#each listingTeams as teamId (teamId)}
				{@const team = teams[teamId]}
				{@const gradeMark = isBlendedEvent ? formatGradeMark(team.grade) : ''}
				<row>
					<team>{gradeMark ? `${team.number} (${gradeMark})` : team.number}</team>
					<scroll-container use:registerScrollContainer>
						<content>
							{#each awardRankings.judgedAwards as awardName, awardIndex (awardName)}
								{@const award = awards[awardName]}
								<!-- The event setup has been updated and an award is removed, but the award rankings are not updated yet -->
								{#if award !== undefined}
									{@const ranking = awardRankings.rankings?.[teamId]?.[awardIndex] ?? 0}
									{@const isNominated = finalAwardNominations[awardName]?.some((nomination) => nomination.teamId === teamId)}
									{@const hasTeamInterview = teamsWithTeamInterview.has(teamId)}
									<NominationButtons
										{award}
										{team}
										judgeGroupId={judgeGroup.id}
										{ranking}
										{isNominated}
										{hasTeamInterview}
										{bypassAwardRequirements}
										showExcellenceAwardWinners={isDesignAward(awardName) &&
											(finalAwardNominations[getPairedExcellenceAwardName(awardName)]?.some((nomination) => nomination.teamId === teamId) ??
												false)}
									/>
								{/if}
							{/each}
						</content>
					</scroll-container>
				</row>
			{/each}
		</table-body>
	</award-rankings-table>
{:else}
	<div class="flex flex-col items-center justify-center">
		<p class="text-gray-500">{m.no_award_rankings_found()}</p>
	</div>
{/if}
