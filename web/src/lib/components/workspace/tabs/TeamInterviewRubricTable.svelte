<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import {
		formatRubricScore,
		sumRubricScores,
		teamInterviewRubricConfig
	} from '@judgesroom.com/protocol/src/rubric';
	import { getRubricCriterionTitle, getRubricProficiencyText, type ProficiencyLevel } from '$lib/rubric-messages';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import ScoringSlider from './ScoringSlider.svelte';

	interface Props {
		rubricScores: number[];
		notes: string;
		isSubmitted: boolean;
		showValidationErrors: boolean;
	}

	let { rubricScores = $bindable(), notes = $bindable(), isSubmitted, showValidationErrors }: Props = $props();

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	const proficiencyLevels: ProficiencyLevel[] = ['exemplary', 'proficient', 'developing', 'beginning'];

	const totalScore = $derived.by(() => {
		if (rubricScores.some((score) => score === -1)) {
			return 'N/A';
		}
		return formatRubricScore(sumRubricScores(rubricScores));
	});
</script>

<div class="mb-2 flex flex-row justify-end gap-2 text-sm lg:hidden!">
	<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
</div>

<rubric-table>
	<rubric-header>
		<criteria class="max-w-42 min-w-42 bg-gray-400">{m.rubric_judged_categories()}</criteria>
		<scroll-container use:registerScrollContainer>
			<content class="min-w-160 flex-col! gap-2 bg-gray-200">
				<div class="p-0! pt-1 text-center text-base font-bold">{m.rubric_proficiency_level()}</div>
				<div class="grid grid-cols-4 border-0! p-0! text-center">
					<div class="border-r pb-1">
						<p class="font-bold">{m.rubric_exemplary()}</p>
					</div>
					<div class="border-r pb-1">
						<p class="font-bold">{m.rubric_proficient()}</p>
					</div>
					<div class="border-r pb-1">
						<p class="font-bold">{m.rubric_developing()}</p>
					</div>
					<div class="pb-1">
						<p class="font-bold">{m.rubric_beginning()}</p>
					</div>
				</div>
			</content>
		</scroll-container>
		<scoring class="flex-col! bg-gray-200">
			<div class="pt-1">&nbsp;</div>
			<div class="flex items-center p-1 font-bold">
				<span>{m.rubric_points()}</span>
			</div>
		</scoring>
	</rubric-header>
	<rubric-body>
		{#each teamInterviewRubricConfig as row, index (row.messageKeyPrefix)}
			<row>
				<criteria class="max-w-42 min-w-42">
					<p class="text-sm font-bold">{getRubricCriterionTitle(row.messageKeyPrefix)} ({row.maxPoints} pts)</p>
				</criteria>
				<scroll-container use:registerScrollContainer>
					<content class="min-w-160">
						{#each proficiencyLevels as level (level)}
							<div>{getRubricProficiencyText(row.messageKeyPrefix, level)}</div>
						{/each}
					</content>
				</scroll-container>
				<scoring>
					{#if isSubmitted}
						<p class="text-lg tabular-nums">{formatRubricScore(rubricScores[index])}</p>
					{:else}
						<ScoringSlider bind:variable={rubricScores[index]} max={row.maxPoints} showError={showValidationErrors} />
					{/if}
				</scoring>
			</row>
		{/each}
		<row class="border-t-3! bg-gray-100">
			<div class="p-2">
				<p class="text-sm font-bold">{m.rubric_notes()}</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}></textarea>
			</div>
			<scoring class="flex-col! gap-2">
				<p>{@html sanitizeHTMLMessage(m.rubric_total_score)}</p>
				<p id="total-score" class="text-lg tabular-nums">{totalScore}</p>
			</scoring>
		</row>
	</rubric-body>
</rubric-table>
