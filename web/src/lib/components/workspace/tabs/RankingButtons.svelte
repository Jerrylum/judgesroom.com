<script lang="ts">
	import { app } from '$lib/index.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { Award } from '@judging.jerryio/protocol/src/award';
	import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';
	import { isSubmittedNotebook } from '@judging.jerryio/protocol/src/team';

	interface Props {
		awardIndex: number;
		awardRankings: AwardRankingsFullUpdate;
		award: Award;
		team: TeamInfoAndData;
		judgeGroupId: string;
		bypassAwardRequirements: boolean;
	}

	let { judgeGroupId, team, awardIndex, awardRankings, award, bypassAwardRequirements }: Props = $props();

	// State for edit mode
	let isEditMode = $state(false);
	let touchTimeout: ReturnType<typeof setTimeout> | null = null;
	let ranking = $derived(awardRankings.rankings?.[team.id]?.[awardIndex] ?? 0);

	const isMeetNotebookRequirement = $derived(award.requireNotebook ? isSubmittedNotebook(team.notebookDevelopmentStatus) : true);
	const isMeetGradeRequirement = $derived(award.acceptedGrades.includes(team.grade));
	const isMeetInnovateAwardSubmissionFormRequirement = $derived(award.name !== 'Innovate Award' || team.hasInnovateAwardSubmissionForm);
	const isDisabled = $derived(
		bypassAwardRequirements ? false : !isMeetNotebookRequirement || !isMeetGradeRequirement || !isMeetInnovateAwardSubmissionFormRequirement
	);

	// Handle ranking update
	async function updateRanking(newRanking: number) {
		if (newRanking < 0 || newRanking > 5) return;

		try {
			await app.wrpcClient.judging.updateAwardRanking.mutation({
				judgeGroupId,
				teamId: team.id,
				awardName: awardRankings.judgedAwards[awardIndex],
				ranking: newRanking
			});
		} catch (error) {
			console.error('Failed to update award ranking:', error);
		}
	}

	// Handle mouse enter (hover)
	function handleMouseEnter() {
		if (!('ontouchstart' in window)) {
			// Only for non-touch devices
			isEditMode = true;
		}
	}

	// Handle mouse leave
	function handleMouseLeave() {
		if (!('ontouchstart' in window)) {
			// Only for non-touch devices
			isEditMode = false;
		}
	}

	// Handle touch/click for mobile devices
	function handleTouch() {
		if ('ontouchstart' in window) {
			// Only for touch devices
			isEditMode = true;

			// Clear existing timeout
			if (touchTimeout) {
				clearTimeout(touchTimeout);
			}

			// Set timeout to hide buttons after 3 seconds
			touchTimeout = setTimeout(() => {
				isEditMode = false;
				touchTimeout = null;
			}, 3000);
		}
	}

	// Handle button clicks
	function handleDecrease() {
		if (ranking > 0) {
			updateRanking(ranking - 1);
		}
	}

	function handleIncrease() {
		if (ranking < 5) {
			updateRanking(ranking + 1);
		}
	}

	// Generate star display
	function getStars(count: number): string {
		return '★'.repeat(count);
	}
</script>

<div
	class="relative min-w-40 max-w-40 cursor-pointer select-none p-2 text-center"
	role="button"
	tabindex="0"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onclick={handleTouch}
	class:cursor-default!={isDisabled}
	onkeydown={(e) => e.key === 'Enter' && handleTouch()}
>
	{#if isDisabled}
		<div class="absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center text-xs text-gray-600">
			{#if !isMeetNotebookRequirement}
				<p>Notebook Required</p>
			{/if}
			{#if !isMeetGradeRequirement}
				<p>{award.acceptedGrades.join(', ')} Required</p>
			{/if}
			{#if !isMeetInnovateAwardSubmissionFormRequirement}
				<p>Submission Form Required</p>
			{/if}
		</div>
	{:else if isEditMode}
		<!-- Edit mode: show minus, stars with count, and plus buttons -->
		<div class="flex items-center justify-center gap-2">
			<button
				class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={ranking <= 0}
				onclick={(e) => {
					e.stopPropagation();
					handleDecrease();
				}}
			>
				−
			</button>

			<div class="flex items-center gap-1 text-gray-600">
				{#if ranking === 0}
					<span class="text-xs">({ranking})</span>
				{:else}
					<span class="text-lg">{getStars(ranking)}</span>
				{/if}
			</div>

			<button
				class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={ranking >= 5}
				onclick={(e) => {
					e.stopPropagation();
					handleIncrease();
				}}
			>
				+
			</button>
		</div>
	{:else}
		<!-- Display mode: show only stars or empty if 0 -->
		<div class="flex min-h-[1.5rem] items-center justify-center text-lg text-gray-600">
			{#if ranking > 0}
				{getStars(ranking)}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Ensure consistent height for the container */
	div[role='button'] {
		min-height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
