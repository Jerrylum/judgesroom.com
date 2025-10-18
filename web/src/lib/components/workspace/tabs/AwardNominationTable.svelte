<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import NominationButtons from './NominationButtons.svelte';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';
	import { ExcellenceAwardNameSchema, type ExcellenceAwardName } from '@judging.jerryio/protocol/src/award';
	import type { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
	import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';

	interface Props {
		title: string;
		judgeGroup: JudgeGroup;
		showAbsentTeams: boolean;
		bypassAwardRequirements: boolean;
	}

	let { title, judgeGroup, showAbsentTeams, bypassAwardRequirements }: Props = $props();

	const allExcellenceAwardNames = Object.keys(ExcellenceAwardNameSchema.enum) as ExcellenceAwardName[];

	const awards = $derived(app.getAllAwardsInMap());
	const teams = $derived(app.getAllTeamInfoAndData());
	const finalAwardNominations = $derived(app.getAllFinalAwardNominations());
	const awardRankings = $derived(subscriptions.allJudgeGroupsAwardRankings[judgeGroup.id]) as AwardRankingsFullUpdate | undefined;

	const allExcellenceAwardWinners = $derived(
		allExcellenceAwardNames.flatMap((awardName) => finalAwardNominations[awardName]?.map((nom) => nom.teamId) ?? [])
	);

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

<div class="flex flex-row items-center justify-between">
	<h3 class="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
	<div class="mb-2 flex flex-row justify-end gap-2 text-sm">
		<button class="lightweight tiny" onclick={scrollLeft}>Scroll Left</button>
		<button class="lightweight tiny" onclick={scrollRight}>Scroll Right</button>
	</div>
</div>
{#if awardRankings}
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
					<team>{teams[teamId].number}</team>
					<scroll-container use:registerScrollContainer>
						<content>
							{#each awardRankings.judgedAwards as awardName, awardIndex}
								{@const award = awards[awardName]}
								<!-- The event setup has been updated and an award is removed, but the award rankings are not updated yet -->
								{#if award !== undefined}
									{@const ranking = awardRankings.rankings?.[teamId]?.[awardIndex] ?? 0}
									{@const isNominated = finalAwardNominations[awardName]?.some((nomination) => nomination.teamId === teamId)}
									<NominationButtons
										{award}
										{team}
										judgeGroupId={judgeGroup.id}
										{ranking}
										{isNominated}
										{bypassAwardRequirements}
										showExcellenceAwardWinners={awardName === 'Design Award' && allExcellenceAwardWinners.includes(teamId)}
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
		<p class="text-gray-500">No award rankings found</p>
	</div>
{/if}
