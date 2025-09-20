<script lang="ts">
	import { app } from '$lib/app-page.svelte';

	interface Props {
		awardName: string;
		teamId: string;
		judgeGroupId: string;
		ranking: number;
		isNominated: boolean;
	}

	let { awardName, teamId, judgeGroupId, ranking, isNominated }: Props = $props();

	async function removeNomination() {
		await app.wrpcClient.judging.removeFromFinalAwardNominations.mutation({ awardName, teamId });
	}

	async function addNomination() {
		await app.wrpcClient.judging.nominateFinalAward.mutation({ awardName, teamId, judgeGroupId });
	}

	// Generate star display
	function getStars(count: number): string {
		return '★'.repeat(count);
	}
</script>

<button
	class="group relative min-w-40 max-w-40 cursor-pointer select-none p-2 text-center"
	onclick={isNominated ? removeNomination : addNomination}
>
	<div class="flex min-h-[1.5rem] items-center justify-center text-lg text-gray-300">
		{getStars(ranking)}
	</div>
	{#if isNominated}
		<div class="absolute left-0 top-0 flex h-full w-full items-center justify-center text-4xl text-gray-600 hover:text-black">✓</div>
	{:else}
		<div class="absolute left-0 top-0 flex h-full w-full items-center justify-center text-4xl opacity-0 group-hover:opacity-30">✓</div>
	{/if}
</button>
