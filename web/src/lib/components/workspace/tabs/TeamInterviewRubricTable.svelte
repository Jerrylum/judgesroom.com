<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import ScoringButtons from './ScoringButtons.svelte';

	interface Props {
		rubricScores: number[];
		notes: string;
		isSubmitted: boolean;
		showValidationErrors: boolean;
	}

	let { rubricScores = $bindable(), notes = $bindable(), isSubmitted, showValidationErrors }: Props = $props();

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();

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
	<button class="lightweight tiny" onclick={scrollLeft}>{m.scroll_left()}</button>
	<button class="lightweight tiny" onclick={scrollRight}>{m.scroll_right()}</button>
</div>
<rubric-table>
	<rubric-header>
		<criteria class="max-w-42 min-w-42 bg-gray-400">{m.rubric_criteria()}</criteria>
		<scroll-container use:registerScrollContainer>
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
				<p class="text-sm font-bold">{m.rubric_ti_engineering_design_process()}</p>
				<i class="text-xs text-gray-500">{m.rubric_all_awards()}</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_engineering_design_process_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_engineering_design_process_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_engineering_design_process_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[0]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[0]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_ti_game_strategy()}</p>
				<i class="text-xs text-gray-500">Design, Innovate, Create, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_game_strategy_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_game_strategy_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_game_strategy_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[1]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[1]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_ti_robot_design()}</p>
				<i class="text-xs text-gray-500">Design, Innovate, Build, Create, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_design_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_design_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_design_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[2]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[2]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_ti_robot_build()}</p>
				<i class="text-xs text-gray-500">Innovate, Build, Create, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_build_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_build_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_build_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[3]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[3]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_ti_robot_programming()}</p>
				<i class="text-xs text-gray-500">Design, Innovate, Think, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_programming_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_programming_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_robot_programming_emerging)}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[4]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[4]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_ti_creativity_originality()}</p>
				<i class="text-xs text-gray-500">Innovate, Create</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{m.rubric_ti_creativity_originality_expert()}</div>
					<div>{m.rubric_ti_creativity_originality_proficient()}</div>
					<div>{m.rubric_ti_creativity_originality_emerging()}</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14">
				{#if isSubmitted}
					<p class="text-lg">{rubricScores[5]}</p>
				{:else}
					<ScoringButtons bind:variable={rubricScores[5]} showError={showValidationErrors} />
				{/if}
			</scoring>
		</row>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">{m.rubric_ti_team_project_management()}</p>
				<i class="text-xs text-gray-500">{m.rubric_all_awards()}</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_team_project_management_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_team_project_management_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_team_project_management_emerging)}</div>
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
				<p class="text-sm font-bold">{m.rubric_ti_teamwork_communication()}</p>
				<i class="text-xs text-gray-500">{m.rubric_all_awards()}</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_teamwork_communication_expert)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_teamwork_communication_proficient)}</div>
					<div>{@html sanitizeHTMLMessage(m.rubric_ti_teamwork_communication_emerging)}</div>
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
				<p class="text-sm font-bold">{m.rubric_ti_respect_courtesy()}</p>
				<i class="text-xs text-gray-500">{m.rubric_all_awards()}</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>{m.rubric_ti_respect_courtesy_expert()}</div>
					<div>{m.rubric_ti_respect_courtesy_proficient()}</div>
					<div>{m.rubric_ti_respect_courtesy_emerging()}</div>
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
				<p class="text-sm font-bold">{m.rubric_ti_special_attributes()}</p>
				<i class="text-xs text-gray-500">Judges, Inspire</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>
						<p>{m.rubric_ti_special_attributes_description()}</p>
						<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}
						></textarea>
					</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 gap-2">
				<p>{m.rubric_total_score()}</p>
				<p class="text-lg">{totalScore}</p>
			</scoring>
		</row>
	</rubric-body>
</rubric-table>
