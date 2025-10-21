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
		eligibilityStatus?: 'eligible' | 'ineligible' | 'no-data';
	}

	const { team, judgeGroup, isWinner, isSkipped, eligibilityStatus = 'no-data' }: Props = $props();

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
	class="cursor-move rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
	class:border-green-500={isWinner}
	class:opacity-50={isSkipped}
>
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<div>
				<p 
					class="text-sm font-medium"
					class:text-green-600={eligibilityStatus === 'eligible'}
					class:text-red-600={eligibilityStatus === 'ineligible'}
					class:text-gray-900={eligibilityStatus === 'no-data'}
				>
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
</div>
