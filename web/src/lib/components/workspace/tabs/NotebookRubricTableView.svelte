<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { formatRubricScore, sumRubricScores, type NotebookProficiencyHeaderScale } from '@judgesroom.com/protocol/src/rubric';
	import {
		getRubricCriterionTitle,
		getRubricProficiencyHeader,
		getRubricProficiencyText,
		getRubricSectionHeading,
		type ProficiencyLevel
	} from '$lib/rubric-messages';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import ScoringSlider from './ScoringSlider.svelte';
	import type { NotebookRubricDocument } from '$lib/notebook-rubric-document.svelte';

	type TableSection = {
		categoryKey: string;
		sectionMaxPoints: number;
		proficiencyHeaderScale: NotebookProficiencyHeaderScale;
		criteria: { messageKeyPrefix: string; maxPoints: number }[];
	};

	interface Props {
		document: NotebookRubricDocument;
		sections: TableSection[];
		isSubmitted: boolean;
		showValidationErrors: boolean;
	}

	let { document, sections, isSubmitted, showValidationErrors }: Props = $props();

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

	const narrowViewport = new MediaQuery('max-width: 1023px');
	let printing = $state(false);
	const showPhoneLayout = $derived(narrowViewport.current && !printing);

	const proficiencyLevels: ProficiencyLevel[] = ['exemplary', 'proficient', 'developing', 'beginning'];

	const sectionScoreOffsets = $derived(
		sections.map((_, sectionIndex) => sections.slice(0, sectionIndex).reduce((sum, section) => sum + section.criteria.length, 0))
	);

	const totalScore = $derived.by(() => {
		if (document.scores.some((score) => score === -1)) {
			return 'N/A';
		}
		return formatRubricScore(sumRubricScores(document.scores));
	});
</script>

<svelte:window onbeforeprint={() => (printing = true)} onafterprint={() => (printing = false)} />

{#if showPhoneLayout}
	<div class="rubric-phone">
		{#each sections as section, sectionIndex (section.categoryKey)}
			<section class="phone-section">
				<header class="phone-section-header">
					<h3>{getRubricSectionHeading(section.categoryKey, section.sectionMaxPoints)}</h3>
				</header>

				{#each section.criteria as row, rowIndex (row.messageKeyPrefix)}
					{@const scoreIndex = sectionScoreOffsets[sectionIndex] + rowIndex}
					<article class="phone-criterion" class:missing={showValidationErrors && document.scores[scoreIndex] === -1}>
						<h4>{getRubricCriterionTitle(row.messageKeyPrefix)}</h4>
						<div class="proficiency-levels">
							{#each proficiencyLevels as level (level)}
								<div>
									<p class="level-name">{getRubricProficiencyHeader(section.proficiencyHeaderScale, level)}</p>
									<p class="level-text">{getRubricProficiencyText(row.messageKeyPrefix, level)}</p>
								</div>
							{/each}
						</div>
						{#if isSubmitted}
							<p class="text-center text-lg font-semibold tabular-nums">{formatRubricScore(document.scores[scoreIndex])}</p>
						{:else}
							<ScoringSlider bind:variable={document.scores[scoreIndex]} max={row.maxPoints} showError={showValidationErrors} />
						{/if}
					</article>
				{/each}
			</section>
		{/each}

		<section class="phone-footer">
			<h3>{m.rubric_notes()}</h3>
			<textarea class="classic" bind:value={document.notes} readonly={isSubmitted}></textarea>
			<p class="phone-total">
				{@html sanitizeHTMLMessage(m.rubric_total_score)}
				<span>{totalScore}</span>
			</p>
		</section>
	</div>
{:else}
	<div class="mb-2 flex flex-row justify-end gap-2 text-sm lg:hidden!">
		<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
		<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
	</div>

	<rubric-table class="notebook-rubric">
		<rubric-body>
			{#each sections as section, sectionIndex (section.categoryKey)}
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
								<p class="text-lg tabular-nums">{formatRubricScore(document.scores[scoreIndex])}</p>
							{:else}
								<ScoringSlider bind:variable={document.scores[scoreIndex]} max={row.maxPoints} showError={showValidationErrors} />
							{/if}
						</scoring>
					</row>
				{/each}
			{/each}
			<row class="footer-row border-t-3! bg-gray-100">
				<div class="p-2">
					<p class="text-sm font-bold">{m.rubric_notes()}</p>
					<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={document.notes} readonly={isSubmitted}
					></textarea>
				</div>
				<scoring class="flex-col! gap-2">
					<p>{@html sanitizeHTMLMessage(m.rubric_total_score)}</p>
					<p class="text-lg tabular-nums">{totalScore}</p>
				</scoring>
			</row>
		</rubric-body>
	</rubric-table>
{/if}
