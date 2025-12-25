<script lang="ts">
	import type { Grade } from '@judgesroom.com/protocol/src/award';
	import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';
	import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
	import type { TeamInfo } from '@judgesroom.com/protocol/src/team';

	interface Props {
		team: TeamInfo;
		judgeGroup: JudgeGroup | null;
		isWinner: boolean;
		isSkipped: boolean;
		excellenceAwardEligibilityStatus: 'eligible' | 'ineligible' | 'no-data';
		thinkAwardEligibilityStatus: 'eligible' | 'ineligible' | 'no-data';
		eligibilityStatus?: 'eligible' | 'ineligible' | 'no-data';
	}

	const { team, judgeGroup, isWinner, isSkipped, excellenceAwardEligibilityStatus, thinkAwardEligibilityStatus, eligibilityStatus }: Props =
		$props();

	const gradeLevel = $derived(getGradeLevel(team.grade));

	function getGradeLevel(grade: Grade) {
		switch (grade) {
			case 'Elementary School':
				return 'ES';
			case 'Middle School':
				return 'MS';
			case 'High School':
				return 'HS';
			default:
				return ''; // College returns empty string
		}
	}
</script>

<div
	class="relative cursor-move rounded-md border-2 border-transparent bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
	class:border-green-500!={isWinner && eligibilityStatus === 'eligible'}
	class:border-red-500!={isWinner && eligibilityStatus === 'ineligible'}
	class:border-slate-500!={isWinner && eligibilityStatus === 'no-data'}
	class:opacity-50={isSkipped}
>
	{#if excellenceAwardEligibilityStatus === 'eligible'}
		<div class="absolute right-2 top-2 text-xs text-green-600">&le;40%</div>
	{:else if excellenceAwardEligibilityStatus === 'ineligible'}
		<div class="absolute right-2 top-2 text-xs text-red-600">&gt;40%</div>
	{/if}
	{#if thinkAwardEligibilityStatus === 'eligible'}
		<div class="absolute right-2 top-2 text-xs text-green-600">AUTO&check;</div>
	{:else if thinkAwardEligibilityStatus === 'ineligible'}
		<div class="absolute right-2 top-2 text-xs text-red-600">AUTO&cross;</div>
	{/if}
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-medium text-gray-900">
				{team ? team.number : 'Unknown Team'}
			</p>
			<p class="text-xs text-gray-500">
				{gradeLevel}
				{#if judgeGroup}
					•
				{/if}
				{#if judgeGroup}
					{judgeGroup.name}
				{/if}
			</p>
		</div>
	</div>
</div>
