<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import type { Award } from '@judging.jerryio/protocol/src/award';
	import type { TeamInfoAndData } from '$lib/team.svelte';

	interface Props {
		award: Award;
		team: TeamInfoAndData;
		judgeGroupId: string;
		ranking: number;
		isNominated: boolean;
		bypassAwardRequirements: boolean;
	}

	let { award, team, judgeGroupId, ranking, isNominated, bypassAwardRequirements }: Props = $props();

	const isMeetNotebookRequirement = $derived(award.requireNotebook ? team.isDevelopedNotebook !== null : true);
	const isMeetGradeRequirement = $derived(award.acceptedGrades.includes(team.grade));
	const isDisabled = $derived(bypassAwardRequirements ? false : (!isMeetNotebookRequirement || !isMeetGradeRequirement));

	async function removeNomination() {
		await app.wrpcClient.judging.removeFromFinalAwardNominations.mutation({ awardName: award.name, teamId: team.id });
	}

	async function addNomination() {
		await app.wrpcClient.judging.nominateFinalAward.mutation({ awardName: award.name, teamId: team.id, judgeGroupId });
	}

	async function onClick() {
		if (isNominated) {
			await removeNomination();
		} else if (!isDisabled) {
			await addNomination();
		}
	}

	// Generate star display
	function getStars(count: number): string {
		return '★'.repeat(count);
	}
</script>

<button
	class="group relative min-w-40 max-w-40 select-none p-2 text-center"
	class:cursor-default!={isDisabled && !isNominated}
	onclick={onClick}
>
	<div class="flex min-h-[1.5rem] items-center justify-center text-lg text-gray-300">
		{getStars(ranking)}
	</div>
	{#if isNominated}
		<div class="absolute left-0 top-0 flex h-full w-full items-center justify-center text-4xl text-gray-600 hover:text-black">✓</div>
	{:else if isDisabled}
		<div class="absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center text-xs text-gray-600">
			{#if !isMeetNotebookRequirement}
				<p>Notebook Required</p>
			{/if}
			{#if !isMeetGradeRequirement}
				<p>{award.acceptedGrades.join(', ')} Required</p>
			{/if}
		</div>
	{:else}
		<div class="absolute left-0 top-0 flex h-full w-full items-center justify-center text-4xl opacity-0 group-hover:opacity-30">✓</div>
	{/if}
</button>
