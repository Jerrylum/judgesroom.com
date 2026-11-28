<script lang="ts">
	import { app, subscriptions } from '#lib/index.svelte.ts';
	import RankingButtons from './RankingButtons.svelte';
	import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';

	interface Props {
		judgeGroup: JudgeGroup;
		teamId: string;
		bypassAwardRequirements: boolean;
	}

	let { judgeGroup, teamId, bypassAwardRequirements }: Props = $props();

	const awards = $derived(app.getAllAwardsInMap());
	const teams = $derived(app.getAllTeamInfoAndData());
	const awardRankings = $derived(subscriptions.allJudgeGroupsAwardRankings[judgeGroup.id]);
	const team = $derived(teams[teamId]);
</script>

{#if awardRankings && team}
	<div class="divide-y divide-gray-200 border-t border-gray-200">
		{#each awardRankings.judgedAwards as awardName, awardIndex (awardName)}
			{@const award = awards[awardName]}
			{#if award !== undefined}
				<div class="flex items-center justify-between gap-4">
					<div class="min-w-0 py-2 text-sm text-gray-900">{awardName}</div>
					<RankingButtons
						{awardIndex}
						{awardRankings}
						{award}
						{team}
						judgeGroupId={awardRankings.judgeGroupId}
						{bypassAwardRequirements}
						showAllStars
					/>
				</div>
			{/if}
		{/each}
	</div>
{/if}
