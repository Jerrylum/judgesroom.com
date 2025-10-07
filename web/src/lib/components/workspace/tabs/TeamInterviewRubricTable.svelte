<script lang="ts">
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

<div class="mb-2 flex flex-row justify-end gap-2 text-sm md:hidden!">
	<button class="lightweight tiny" onclick={scrollLeft}>Scroll Left</button>
	<button class="lightweight tiny" onclick={scrollRight}>Scroll Right</button>
</div>
<rubric-table>
	<rubric-header>
		<criteria class="max-w-42 min-w-42 bg-gray-400">CRITERIA</criteria>
		<scroll-container use:registerScrollContainer>
			<content class="min-w-120 flex-col! gap-2 bg-gray-200">
				<div class="p-0! pt-1 text-center text-base font-bold">PROFICIENCY LEVEL</div>
				<div class="border-0! p-0! flex text-center">
					<div class="flex-1 border-r pb-1">
						<p class="font-bold">EXPERT</p>
						<p class="text-xs">(4-5 POINTS)</p>
					</div>
					<div class="flex-1 pb-1">
						<p class="font-bold">PROFICIENT</p>
						<p class="text-xs">(2-3 POINTS)</p>
					</div>
					<div class="flex-1 border-l pb-1">
						<p class="font-bold">EMERGING</p>
						<p class="text-xs">(0-1 POINTS)</p>
					</div>
				</div>
			</content>
		</scroll-container>
		<scoring class="flex-col! min-w-14 bg-gray-200">
			<div class="pt-1">&nbsp;</div>
			<div class="flex items-center p-1 font-bold">
				<span>POINTS</span>
			</div>
		</scoring>
	</rubric-header>
	<rubric-body>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">ENGINEERING DESIGN PROCESS</p>
				<i class="text-xs text-gray-500">All Awards</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>
						Team shows evidence of independent inquiry <u>from the beginning stages</u> of their design process. This includes brainstorming,
						testing, and exploring alternative solutions.
					</div>
					<div>Team shows evidence of independent inquiry for <u>some elements</u> of their design process.</div>
					<div>Team <u>shows little to no evidence</u> of independent inquiry in their design process.</div>
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
				<p class="text-sm font-bold">GAME STRATEGY</p>
				<i class="text-xs text-gray-500">Design, Innovate, Create, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>Team can fully explain their <u>entire</u> game strategy including game analysis.</div>
					<div>Team can explain their current strategy with <u>limited evidence of game analysis</u>.</div>
					<div>Team <u>did not explain</u> game strategy, or strategy is not student-directed.</div>
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
				<p class="text-sm font-bold">ROBOT DESIGN</p>
				<i class="text-xs text-gray-500">Design, Innovate, Build Create, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>Team can <u>fully explain</u> the evolution of their robot design to the current design.</div>
					<div>
						Team can provide a <u>limited description</u> of why the current robot design was chosen, but shows limited evolution.
					</div>
					<div>Team <u>did not explain</u> robot design, or design is not student-directed.</div>
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
				<p class="text-sm font-bold">ROBOT BUILD</p>
				<i class="text-xs text-gray-500">Innovate, Build, Create, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>Team can <u>fully explain</u> their robot construction. Ownership of the robot build is evident.</div>
					<div>Team can describe why the current robot design was chosen, but with <u>limited explanation</u>.</div>
					<div>Team <u>did not explain</u> robot build, or build is not student-directed.</div>
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
				<p class="text-sm font-bold">ROBOT PROGRAMMING</p>
				<i class="text-xs text-gray-500">Design, Innovate, Think, Amaze</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>Team can <u>fully explain</u> the evolution of their programming.</div>
					<div>
						Team can describe how the current programs work, but with
						<u>limited evolution</u>.
					</div>
					<div>Team <u>did not explain</u> programming, or programming is not student-directed.</div>
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
				<p class="text-sm font-bold">CREATIVITY / ORIGINALITY</p>
				<i class="text-xs text-gray-500">Innovate, Create</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>Team can describe creative aspect(s) of their robot with clarity and detail.</div>
					<div>Team can describe a creative solution but the answer lacks detail.</div>
					<div>Team has difficulty describing a creative solution or gives minimal response.</div>
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
				<p class="text-sm font-bold">TEAM AND PROJECT MANAGEMENT</p>
				<i class="text-xs text-gray-500">All Awards</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>
						Team can explain <u>how team progress was tracked against an overall project timeline</u>. Team can explain management of
						material and personnel resources.
					</div>
					<div>
						Team can explain <u>how team progress was monitored</u>, and some degree of management of material and personnel resources.
					</div>
					<div>Team <u>cannot explain how team progress was monitored</u> or how resources were managed.</div>
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
				<p class="text-sm font-bold">TEAMWORK, COMMUNICATION, PROFESSIONALISM</p>
				<i class="text-xs text-gray-500">All Awards</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>
						<u>Most or all team members contribute to explanations</u> of the design process, game strategy, and other work done by the team.
					</div>
					<div>
						<u>Some team members contribute to explanations</u> of the design process, game strategy, and other work done by the team.
					</div>
					<div>
						<u>Few team members contribute to explanations</u> of the design process, game strategy, and other work done by the team.
					</div>
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
				<p class="text-sm font-bold">RESPECT, COURTESY, POSITIVITY</p>
				<i class="text-xs text-gray-500">All Awards</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>Team consistently interacts respectfully, courteously, and positively in their interview.</div>
					<div>Team interactions show signs of respect and courtesy, but there is room for improvement.</div>
					<div>Team interactions lack respectful and courteous behavior.</div>
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
				<p class="text-sm font-bold">SPECIAL ATTRIBUTES & OVERALL IMPRESSIONS</p>
				<i class="text-xs text-gray-500">Judges, Inspire</i>
			</criteria>
			<scroll-container use:registerScrollContainer>
				<content class="min-w-120">
					<div>
						<p>
							Does the team have any special attributes, accomplishments, or exemplary effort in overcoming challenges at this event? Did
							anything stand out about this team in their interview? Please describe:
						</p>
						<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}
						></textarea>
					</div>
				</content>
			</scroll-container>
			<scoring class="min-w-14 gap-2">
				<p>TOTAL<br />SCORE</p>
				<p class="text-lg">{totalScore}</p>
			</scoring>
		</row>
	</rubric-body>
</rubric-table>
