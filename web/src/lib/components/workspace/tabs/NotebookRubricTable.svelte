<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { formatRubricScore, notebookRubricSections, sumRubricScores } from '@judgesroom.com/protocol/src/rubric';
	import {
		getRubricCriterionTitle,
		getRubricProficiencyHeader,
		getRubricProficiencyText,
		getRubricSectionHeading,
		type ProficiencyLevel
	} from '$lib/rubric-messages';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import ScoringSlider from './ScoringSlider.svelte';

	interface Props {
		rubricScores: number[];
		notes: string;
		innovateAwardNotes: string;
		isSubmitted: boolean;
		showValidationErrors: boolean;
	}

	let {
		rubricScores = $bindable(),
		notes = $bindable(),
		innovateAwardNotes = $bindable(),
		isSubmitted,
		showValidationErrors
	}: Props = $props();

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	const proficiencyLevels: ProficiencyLevel[] = ['exemplary', 'proficient', 'developing', 'beginning'];

	const sectionScoreOffsets = notebookRubricSections.map((_, sectionIndex) =>
		notebookRubricSections.slice(0, sectionIndex).reduce((sum, section) => sum + section.criteria.length, 0)
	);

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

<rubric-table class="notebook-rubric">
	<rubric-body>
		{#each notebookRubricSections as section, sectionIndex (section.categoryKey)}
			<row class="section-title-row">
				<div class="grow border-r-3 border-l-3 p-2 text-left text-sm font-bold">
					{getRubricSectionHeading(section.categoryKey, section.sectionMaxPoints)}
				</div>
			</row>
			<row class="section-header-row">
				<criteria class="max-w-42 min-w-42 bg-gray-400 font-bold">{m.rubric_criteria()}</criteria>
				<scroll-container use:registerScrollContainer>
					<content class="min-w-160 bg-gray-200">
						{#each proficiencyLevels as level (level)}
							<div class="text-center font-bold">
								{getRubricProficiencyHeader(section.proficiencyHeaderScale, level)}
							</div>
						{/each}
					</content>
				</scroll-container>
				<scoring class="bg-gray-200 font-bold">{m.rubric_points()}</scoring>
			</row>
			{#each section.criteria as row, rowIndex (row.messageKeyPrefix)}
				{@const scoreIndex = sectionScoreOffsets[sectionIndex] + rowIndex}
				<row class="criteria-row">
					<criteria class="max-w-42 min-w-42 font-bold">
						<p class="text-sm">{getRubricCriterionTitle(row.messageKeyPrefix)}</p>
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
							<p class="text-lg tabular-nums">{formatRubricScore(rubricScores[scoreIndex])}</p>
						{:else}
							<ScoringSlider bind:variable={rubricScores[scoreIndex]} max={row.maxPoints} showError={showValidationErrors} />
						{/if}
					</scoring>
				</row>
			{/each}
		{/each}
		<row class="footer-row border-t-3! bg-gray-100">
			<div class="p-2">
				<p class="text-sm font-bold">{m.rubric_notes()}</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}></textarea>
			</div>
			<scoring></scoring>
		</row>
		<row class="footer-row">
			<div class="p-2">
				<p class="text-sm font-bold">{m.rubric_nb_innovate_award_notes()}</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={innovateAwardNotes} readonly={isSubmitted}
				></textarea>
			</div>
			<scoring class="flex-col! gap-2">
				<p>{@html sanitizeHTMLMessage(m.rubric_total_score)}</p>
				<p class="text-lg tabular-nums">{totalScore}</p>
			</scoring>
		</row>
	</rubric-body>
</rubric-table>
