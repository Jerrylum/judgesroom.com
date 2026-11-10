<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import {
		INTERVIEW_2_0_CRITERION_MAX,
		INTERVIEW_2_0_MAX_SCORE,
		interview2_0RubricSections
	} from '@judgesroom.com/protocol/src/interview-2.0';
	import { formatRubricScore } from '@judgesroom.com/protocol/src/rubric';
	import { getRubricCriterionTitle, getRubricSectionHeading } from '$lib/rubric-messages';
	import type { TeamInterviewRubricDocument } from '$lib/interview-rubric-document.svelte';
	import ScoringSlider from './ScoringSlider.svelte';
	import { app } from '$lib/index.svelte';

	interface Props {
		document: TeamInterviewRubricDocument;
		isSubmitted: boolean;
		showValidationErrors: boolean;
	}

	let { document, isSubmitted, showValidationErrors }: Props = $props();

	const scoreStep = $derived(app.getInterviewRubricScoreStep());

	const narrowViewport = new MediaQuery('max-width: 1023px');
	let printing = $state(false);
	const showPhoneLayout = $derived(narrowViewport.current && !printing);

	const totalScore = $derived.by(() => {
		const total = document.totalScore();
		return total === null ? 'N/A' : formatRubricScore(total);
	});
</script>

<svelte:window onbeforeprint={() => (printing = true)} onafterprint={() => (printing = false)} />

<p class="mb-4 text-sm text-gray-600 lg:mb-6">
	{@html sanitizeHTMLMessage(m.team_interview_rubric_2_0_directions)}
</p>

{#if showPhoneLayout}
	<div class="rubric-phone">
		<div class="score-legend">
			<div>
				<p class="font-bold">2 · {m.rubric_ti_2_0_chip_specifics()}</p>
				<p>{m.rubric_ti_2_0_meaning_specifics()}</p>
			</div>
			<div>
				<p class="font-bold">1 · {m.rubric_ti_2_0_chip_heard()}</p>
				<p>{m.rubric_ti_2_0_meaning_heard()}</p>
			</div>
			<div>
				<p class="font-bold">0 · {m.rubric_ti_2_0_chip_not_yet()}</p>
				<p>{m.rubric_ti_2_0_meaning_not_yet()}</p>
			</div>
		</div>

		{#each interview2_0RubricSections as section (section.sectionKey)}
			<section class="phone-section">
				<header class="phone-section-header">
					<h3>{getRubricSectionHeading(section.categoryKey, section.sectionMaxPoints)}</h3>
				</header>

				<details class="sample-questions">
					<summary>{m.rubric_ti_2_0_sample_questions_short()}</summary>
					<p>{m.rubric_ti_2_0_sample_questions()}</p>
					<ul>
						{#each section.sampleQuestionKeys as questionKey (questionKey)}
							<li>{getRubricCriterionTitle(questionKey)}</li>
						{/each}
					</ul>
				</details>

				{#each section.criteria as row (row.criterionKey)}
					{@const criterion = document.criterion(section.sectionKey, row.criterionKey)}
					<article class="phone-criterion" class:missing={showValidationErrors && criterion.points === -1}>
						<h4>{getRubricCriterionTitle(row.messageKeyPrefix)}</h4>
						<p class="listen-for-label">{m.rubric_ti_2_0_listen_for()}</p>
						<ul>
							{#each row.listenForKeys as listenKey (listenKey)}
								<li>{getRubricCriterionTitle(listenKey)}</li>
							{/each}
						</ul>
						{#if isSubmitted}
							<p class="text-center text-lg font-semibold tabular-nums">{formatRubricScore(criterion.points)}</p>
						{:else}
							<ScoringSlider
								bind:variable={criterion.points}
								max={INTERVIEW_2_0_CRITERION_MAX}
								step={scoreStep}
								showError={showValidationErrors}
							/>
						{/if}
						<textarea
							class="classic"
							bind:value={criterion.notes}
							readonly={isSubmitted}
							placeholder={m.rubric_ti_2_0_row_notes()}
							aria-label={m.rubric_ti_2_0_row_notes()}
						></textarea>
					</article>
				{/each}
			</section>
		{/each}

		<section class="phone-footer">
			<h3>{m.rubric_ti_2_0_additional_notes()}</h3>
			{#if document.payload}
				<textarea class="classic" bind:value={document.payload.additionalNotes} readonly={isSubmitted}></textarea>
			{/if}
			<p class="phone-total">
				{@html sanitizeHTMLMessage(m.rubric_total_score)}
				<span>{totalScore}</span>
			</p>
		</section>
	</div>
{:else}
	<rubric-table class="interview-rubric-2-0">
		<rubric-body>
			{#each interview2_0RubricSections as section (section.sectionKey)}
				<row class="section-title-row">
					<div class="grow border-r-3 border-l-3 p-2 text-left text-sm">
						<p class="font-bold">{getRubricSectionHeading(section.categoryKey, section.sectionMaxPoints)}</p>
						<p class="mt-2 text-xs font-semibold text-gray-700">{m.rubric_ti_2_0_sample_questions()}</p>
						<ul class="mt-1 list-disc pl-5 text-xs text-gray-700">
							{#each section.sampleQuestionKeys as questionKey (questionKey)}
								<li>{getRubricCriterionTitle(questionKey)}</li>
							{/each}
						</ul>
					</div>
				</row>
				<row class="section-header-row">
					<criteria class="bg-gray-400 font-bold">{m.rubric_criteria()}</criteria>
					<remaining class="score-level-headers">
						<div class="bg-gray-200">
							<p class="font-bold">{m.rubric_ti_2_0_hdr_specifics()}</p>
							<p class="mt-1 text-xs font-normal text-gray-700">{m.rubric_ti_2_0_meaning_specifics()}</p>
						</div>
						<div class="bg-gray-200">
							<p class="font-bold">{m.rubric_ti_2_0_hdr_heard()}</p>
							<p class="mt-1 text-xs font-normal text-gray-700">{m.rubric_ti_2_0_meaning_heard()}</p>
						</div>
						<div class="bg-gray-200">
							<p class="font-bold">{m.rubric_ti_2_0_hdr_not_yet()}</p>
							<p class="mt-1 text-xs font-normal text-gray-700">{m.rubric_ti_2_0_meaning_not_yet()}</p>
						</div>
					</remaining>
					<scoring class="bg-gray-200 font-bold">{m.rubric_points()}</scoring>
				</row>
				{#each section.criteria as row (row.criterionKey)}
					{@const criterion = document.criterion(section.sectionKey, row.criterionKey)}
					<row class="criteria-row">
						<criteria>
							<p class="text-sm font-bold">{getRubricCriterionTitle(row.messageKeyPrefix)}</p>
							<p class="mt-2 text-xs font-semibold text-gray-700">{m.rubric_ti_2_0_listen_for()}</p>
							<ul class="mt-1 list-disc pl-4 text-left text-xs font-normal text-gray-700">
								{#each row.listenForKeys as listenKey (listenKey)}
									<li>{getRubricCriterionTitle(listenKey)}</li>
								{/each}
							</ul>
						</criteria>
						<remaining>
							<textarea
								class="block min-h-24 w-full grow border border-gray-300 p-1 text-xs font-normal"
								bind:value={criterion.notes}
								readonly={isSubmitted}
								aria-label={m.rubric_ti_2_0_row_notes()}
							></textarea>
						</remaining>
						<scoring class:missing={showValidationErrors && criterion.points === -1}>
							{#if isSubmitted}
								<p class="text-lg tabular-nums">{formatRubricScore(criterion.points)}</p>
							{:else}
								<ScoringSlider
								bind:variable={criterion.points}
								max={INTERVIEW_2_0_CRITERION_MAX}
								step={scoreStep}
								showError={showValidationErrors}
							/>
							{/if}
						</scoring>
					</row>
				{/each}
			{/each}
			<row class="footer-row border-t-3! bg-gray-100">
				<div class="p-2">
					<p class="text-sm font-bold">{m.rubric_ti_2_0_additional_notes()}</p>
					{#if document.payload}
						<textarea
							class="mt-2 block h-24 min-h-20 w-full border border-gray-300 p-1"
							bind:value={document.payload.additionalNotes}
							readonly={isSubmitted}
						></textarea>
					{/if}
				</div>
				<scoring class="flex-col! gap-2">
					<p>{@html sanitizeHTMLMessage(m.rubric_total_score)}</p>
					<p id="total-score" class="text-lg tabular-nums">{totalScore}</p>
				</scoring>
			</row>
		</rubric-body>
	</rubric-table>
{/if}
