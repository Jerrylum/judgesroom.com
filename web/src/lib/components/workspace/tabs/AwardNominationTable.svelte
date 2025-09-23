<script lang="ts">
	import { app, subscriptions } from '$lib/app-page.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import NominationButtons from './NominationButtons.svelte';
	import { sortByTeamNumberInMap } from '$lib/team.svelte';
	import { ExcellenceAwardNameSchema, type ExcellenceAwardName } from '@judging.jerryio/protocol/src/award';

	interface Props {
		title: string;
		judgeGroupId: string;
		showExcludedTeams: boolean;
		bypassAwardRequirements: boolean;
	}

	let { title, judgeGroupId, showExcludedTeams, bypassAwardRequirements }: Props = $props();

	const allExcellenceAwardNames = Object.keys(ExcellenceAwardNameSchema.enum) as ExcellenceAwardName[];

	const awards = $derived(app.getAllAwardsInMap());
	const teams = $derived(app.getAllTeamInfoAndData());
	const judgeGroups = $derived(app.getAllJudgeGroupsInMap());
	const finalAwardNominations = $derived(app.getAllFinalAwardNominations());
	const awardRankings = $derived(subscriptions.allJudgeGroupsAwardRankings[judgeGroupId]);

	const allExcellenceAwardWinners = $derived(
		allExcellenceAwardNames.flatMap((awardName) => finalAwardNominations[awardName]?.map((nom) => nom.teamId) ?? [])
	);

	const listingTeams = $derived.by(() => {
		const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[judgeGroupId] ?? [];
		const assignedTeams = judgeGroups[judgeGroupId].assignedTeams;
		const allTeams = [...reviewedTeams, ...assignedTeams];
		const uniqueTeams = new Set(allTeams);
		const teamIds = Array.from(uniqueTeams);

		// Filter by excluded teams if showExcludedTeams is false
		const filteredTeams = showExcludedTeams ? teamIds : teamIds.filter((teamId) => !teams[teamId]?.excluded);

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
				<team>{teams[teamId].number}</team>
				<scroll-container use:registerScrollContainer>
					<content>
						{#each awardRankings.judgedAwards as awardName, awardIndex}
							{@const award = awards[awardName]}
							{@const ranking = awardRankings.rankings?.[teamId]?.[awardIndex] ?? 0}
							{@const isNominated = finalAwardNominations[awardName]?.some((nomination) => nomination.teamId === teamId)}
							<NominationButtons
								{award}
								{team}
								{judgeGroupId}
								{ranking}
								{isNominated}
								{bypassAwardRequirements}
								showExcellenceAwardWinners={awardName === 'Design Award' && allExcellenceAwardWinners.includes(teamId)}
							/>
						{/each}
					</content>
				</scroll-container>
			</row>
		{/each}
	</table-body>
</award-rankings-table>
