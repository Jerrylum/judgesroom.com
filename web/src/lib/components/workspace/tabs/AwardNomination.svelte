<script lang="ts">
	import type { Grade } from '@judging.jerryio/protocol/src/award';
	import type { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import type { TeamInfo } from '@judging.jerryio/protocol/src/team';

	interface Props {
		team: TeamInfo;
		judgeGroup: JudgeGroup | null;
		isWinner: boolean;
		isSkipped: boolean;
	}

	const { team, judgeGroup, isWinner, isSkipped }: Props = $props();

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
</div>
