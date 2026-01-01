<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import ScoringButtons from './ScoringButtons.svelte';

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

	const { registerScrollContainer: rsc1, scrollLeft: sl1, scrollRight: sr1 } = scrollSync();
	const { registerScrollContainer: rsc2, scrollLeft: sl2, scrollRight: sr2 } = scrollSync();

	// Calculate total score
	const totalScore = $derived.by(() => {
		if (rubricScores.find((score) => score === -1)) {
			return 'N/A';
		} else {
			return rubricScores.reduce((sum, score) => sum + score, 0).toString();
		}
	});
</script>

<div class="md:hidden! mb-2 flex flex-row justify-end gap-2 text-sm">
	<button class="lightweight tiny" onclick={sl1}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={sr1}>{m.scroll_right()}</button>
</div>
<rubric-table>
	<rubric-header>
		<div class="max-w-42 min-w-42 flex grow flex-col items-stretch justify-center bg-gray-400 p-0 text-center font-bold">
			<div class="border-b-3 flex-1 grow bg-gray-200">{m.rubric_criteria()}</div>
			<div class="pb-1 pt-1 leading-none">{m.rubric_ti_engineering_design_process()}</div>
		</div>
		<scroll-container use:rsc1>
			<content class="min-w-120 flex-col! gap-2 bg-gray-200">
				<div class="p-0! pt-1 text-center text-base font-bold">{m.rubric_proficiency_level()}</div>
				<div class="border-0! p-0! flex text-center">
					<div class="flex-1 border-r pb-1">
						<p class="font-bold">{m.rubric_expert()}</p>
						<p class="text-xs">{m.rubric_points_4_5()}</p>
					</div>
					<div class="flex-1 pb-1">
						<p class="font-bold">{m.rubric_proficient()}</p>
						<p class="text-xs">{m.rubric_points_2_3()}</p>
					</div>
					<div class="flex-1 border-l pb-1">
						<p class="font-bold">{m.rubric_emerging()}</p>
						<p class="text-xs">{m.rubric_points_0_1()}</p>
					</div>
				</div>
			</content>
		</scroll-container>
		<scoring class="flex-col! min-w-14 bg-gray-200">
			<div class="pt-1">&nbsp;</div>
			<div class="flex items-center p-1 font-bold">
				<span>{m.rubric_points()}</span>
			</div>
		</scoring>
	</rubric-header>
	<rubric-body>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_identify_problem()}</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_identify_problem_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_identify_problem_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_identify_problem_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 max-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[0]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[0]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_brainstorm_solutions()}</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_brainstorm_solutions_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_brainstorm_solutions_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_brainstorm_solutions_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 max-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[1]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[1]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_select_best_solution()}</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_select_best_solution_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_select_best_solution_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_select_best_solution_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 max-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[2]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[2]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_build_program_solution()}</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_build_program_solution_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_build_program_solution_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_build_program_solution_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 max-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[3]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[3]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_original_testing()}</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_original_testing_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_original_testing_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_original_testing_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 max-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[4]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[4]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_repeat_design_process()}</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_repeat_design_process_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_repeat_design_process_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_repeat_design_process_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 max-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[5]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[5]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row class="border-t-3! bg-gray-100">
			<div class="p-2">
				<p class="text-sm font-bold">{m.rubric_notes()}</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}></textarea>
			</div>
			<scoring class="min-w-14 max-w-14"></scoring>
		</row>
	</rubric-body>
</rubric-table>
<!-- Second rubric table -->
<div class="md:hidden! mt-6 flex flex-row items-center justify-end gap-2 text-sm">
	<button class="lightweight tiny" onclick={sl2}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={sr2}>{m.scroll_right()}</button>
</div>
<rubric-table class="mt-2 md:mt-6">
	<rubric-header>
		<div class="max-h-42 flex min-h-20 grow items-center justify-center text-center text-2xl font-bold">
			{m.rubric_nb_page_2_of_2()}
		</div>
	</rubric-header>
	<rubric-header>
		<criteria class="max-w-42 min-w-42 bg-gray-400">
			<p class="text-sm font-bold">{m.rubric_nb_format_and_content()}</p>
		</criteria>
		<scroll-container use:rsc2 class="flex items-stretch bg-gray-200">
			<content class="min-w-120 flex-col! gap-2">
				<div class="border-0! p-0! flex text-center">
					<div class="flex flex-1 flex-col justify-center border-r">
						<p class="font-bold">{m.rubric_expert()}</p>
						<p class="text-xs">{m.rubric_points_4_5()}</p>
					</div>
					<div class="flex flex-1 flex-col justify-center">
						<p class="font-bold">{m.rubric_proficient()}</p>
						<p class="text-xs">{m.rubric_points_2_3()}</p>
					</div>
					<div class="flex flex-1 flex-col justify-center border-l">
						<p class="font-bold">{m.rubric_emerging()}</p>
						<p class="text-xs">{m.rubric_points_0_1()}</p>
					</div>
				</div>
			</content>
		</scroll-container>
		<scoring class="min-w-14 bg-gray-200">
			<div class="flex items-center font-bold">
				<span>{m.rubric_points()}</span>
			</div>
		</scoring>
	</rubric-header>
	<rubric-body>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_independent_inquiry()}</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_independent_inquiry_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_independent_inquiry_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_independent_inquiry_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[6]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[6]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_usability_completeness()}</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_usability_completeness_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_usability_completeness_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_usability_completeness_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[7]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[7]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_originality_quality()}</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_originality_quality_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_originality_quality_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_originality_quality_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[8]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[8]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_organization_readability()}</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_organization_readability_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_organization_readability_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_organization_readability_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[9]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[9]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_nb_team_project_management()}</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_team_project_management_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_team_project_management_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_nb_team_project_management_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[10]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[10]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<div class="p-2">
				<p class="text-sm font-bold">{m.rubric_nb_innovate_award_notes()}</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={innovateAwardNotes} readonly={isSubmitted}
				></textarea>
			</div>
			<scoring class="flex-col! min-w-14 max-w-14 gap-2">
				<p>{m.rubric_total_score()}</p>
				<p class="text-lg">{totalScore}</p>
			</scoring>
		</row>
	</rubric-body>
</rubric-table>
