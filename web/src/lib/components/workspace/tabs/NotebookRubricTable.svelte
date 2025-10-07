<script lang="ts">
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

<div class="mb-2 flex flex-row justify-end gap-2 text-sm md:hidden!">
	<button class="lightweight tiny" onclick={sl1}>Scroll Left</button>
	<button class="lightweight tiny" onclick={sr1}>Scroll Right</button>
</div>
<rubric-table>
	<rubric-header>
		<div class="max-w-42 min-w-42 flex flex-grow flex-col items-stretch justify-center bg-gray-400 p-0 text-center font-bold">
			<div class="border-b-3 flex-1 flex-grow bg-gray-200">CRITERIA</div>
			<div class="pb-1 pt-1 leading-none">ENGINEERING DESIGN PROCESS</div>
		</div>
		<scroll-container use:rsc1>
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
				<p class="text-sm font-bold">IDENTIFY THE PROBLEM / DESIGN GOAL(S)</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>
						Clearly <u>identifies</u> the problem / design goal(s) <u>in detail at the start of each design process cycle</u>. This can
						include elements of game strategy, robot design, or programming, and should include a clear definition and justification of the
						design goal(s), criteria, and constraints.
					</div>
					<div>
						Identifies the problem / design goal(s) at the start of each design cycle but is <u>lacking details or justification</u>.
					</div>
					<div><u>Does not identify the problem / design goal(s)</u> at the start of each design cycle.</div>
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
				<p class="text-sm font-bold">BRAINSTORM SOLUTIONS</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>
						<u>Explores several different solutions</u> with explanation. Citations are provided for ideas that came from outside sources such
						as online videos or other teams.
					</div>
					<div><u>Explores few solutions</u>. Citations provided for ideas that came from outside sources.</div>
					<div><u>Does not explore different solutions</u> or solutions are recorded with <u>little explanation</u>.</div>
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
				<p class="text-sm font-bold">SELECT BEST SOLUTION</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>
						<u
							>Fully explains the “why” behind design decisions in each step of the design process for all significant aspects of a team’s
							design.
						</u>
					</div>
					<div><u>Inconsistently explains the “why” behind design decisions</u>.</div>
					<div><u>Minimally explains the “why” behind design decisions.</u></div>
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
				<p class="text-sm font-bold">BUILD AND PROGRAM THE SOLUTION</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>
						Records the steps the team took to build and program the solution. Includes
						<u>enough detail that the reader can follow the logic</u> used by the team to develop their robot design, as well as recreate the
						robot design from the documentation.
					</div>
					<div>
						Records the key steps to build and program the solution but <u>
							lacks sufficient detail for the reader to follow their process.
						</u>
					</div>
					<div><u>Does not record the key steps</u> to build and program the solution.</div>
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
				<p class="text-sm font-bold">ORIGINAL TESTING OF SOLUTIONS</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>
						<u>Records all the steps</u> to test the solution, including test results. Testing methodology is clearly explained, and the
						testing is <u>done by the team</u>. <u>Original</u> testing results are explained and conclusions are drawn from that data.
					</div>
					<div>
						<u>Records the key steps</u> to test the solution. Testing methodology may be incomplete, or incomplete conclusions are recorded.
					</div>
					<div><u>Does not record steps</u> to test the solution. Testing or results are borrowed from another team’s work.</div>
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
				<p class="text-sm font-bold">REPEAT DESIGN PROCESS</p>
			</criteria>
			<scroll-container use:rsc1>
				<content class="min-w-120">
					<div>
						Shows that the <u>design process is repeated multiple times</u> to work towards a design goal. This includes a clear definition and
						justification of the design goal(s), its criteria, and constraints. The notebook shows setbacks that the team learned from, and shows
						design alternatives that were considered but not pursued.
					</div>
					<div>
						<u>Design process is not often repeated</u> for design goals or robot/game performance. The notebook does not show alternate lines
						of inquiry, setbacks, or other learning experiences.
					</div>
					<div>
						<u>Does not show that the design process is repeated</u>. Does not show setbacks or failures, or seems to be curated to craft a
						narrative.
					</div>
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
				<p class="text-sm font-bold">NOTES:</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes} readonly={isSubmitted}></textarea>
			</div>
			<scoring class="min-w-14 max-w-14"></scoring>
		</row>
	</rubric-body>
</rubric-table>
<!-- Second rubric table -->
<div class="mt-6 flex flex-row items-center justify-end gap-2 text-sm md:hidden!">
	<button class="lightweight tiny" onclick={sl2}>Scroll Left</button>
	<button class="lightweight tiny" onclick={sr2}>Scroll Right</button>
</div>
<rubric-table class="mt-2 md:mt-6">
	<rubric-header>
		<div class="max-h-42 flex min-h-20 flex-grow items-center justify-center text-center text-2xl font-bold">
			Engineering Notebook Rubric (Page 2 of 2)
		</div>
	</rubric-header>
	<rubric-header>
		<criteria class="max-w-42 min-w-42 bg-gray-400">
			<p class="text-sm font-bold">ENGINEERING NOTEBOOK FORMAT AND CONTENT</p>
		</criteria>
		<scroll-container use:rsc2 class="flex items-stretch bg-gray-200">
			<content class="min-w-120 flex-col! gap-2">
				<div class="border-0! p-0! flex text-center">
					<div class="flex flex-1 flex-col justify-center border-r">
						<p class="font-bold">EXPERT</p>
						<p class="text-xs">(4-5 POINTS)</p>
					</div>
					<div class="flex flex-1 flex-col justify-center">
						<p class="font-bold">PROFICIENT</p>
						<p class="text-xs">(2-3 POINTS)</p>
					</div>
					<div class="flex flex-1 flex-col justify-center border-l">
						<p class="font-bold">EMERGING</p>
						<p class="text-xs">(0-1 POINTS)</p>
					</div>
				</div>
			</content>
		</scroll-container>
		<scoring class="min-w-14 bg-gray-200">
			<div class="flex items-center font-bold">
				<span>POINTS</span>
			</div>
		</scoring>
	</rubric-header>
	<rubric-body>
		<row>
			<criteria class="max-w-42 min-w-42">
				<p class="text-sm font-bold">INDEPENDENT INQUIRY</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>
						Team shows evidence of independent inquiry <u>from the beginning stages</u> of their design process. Notebook documents whether the
						implemented ideas have their origin with students on the team, or if students found inspiration elsewhere.
					</div>
					<div>
						Team shows evidence of independent inquiry for <u>some elements</u> of their design process. Ideas and information from outside the
						team are documented.
					</div>
					<div>
						Team <u>shows little to no evidence</u> of independent inquiry in their design process. Ideas from outside the team are not properly
						credited. Ideas or designs appear with no evidence of process.
					</div>
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
				<p class="text-sm font-bold">USABILITY & COMPLETENESS</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>
						<u>Records the entire design and development process</u> with enough clarity and detail that the reader could recreate the project’s
						history. Notebook has recent entries that align with the robot the team has brought to the event.
					</div>
					<div>
						Records the design and development process completely but <u>lacks sufficient detail</u>. Documentation is inconsistent with
						possible gaps.
					</div>
					<div>
						<u>Lacks sufficient detail</u> to understand the design process. Notebook has large gaps in time, or does not align with the robot
						the team has brought to the event.
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
				<p class="text-sm font-bold">ORIGINALITY & QUALITY</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>
						Content is kept to relevant information and all content not original to the team longer than a paragraph is located in
						appendices to the Engineering Notebook. Information originating from outside the team is always properly cited in the notebook
						with the source and date accessed. <u>Most or all Engineering Notebook content is original to the submitting team members.</u>
					</div>
					<div>
						<u>
							Cited content is mostly kept to relevant information. Information originating from outside the team is properly credited.
						</u> Cited content is paraphrased with some original content describing the team’s design process.
					</div>
					<div>
						<u>Cited content is excessive and/or is not kept in appendices, or non-original content is not cited.</u> Plagiarised content should
						be noted to the JA and through the REC Foundation Code of Conduct process.
					</div>
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
				<p class="text-sm font-bold">ORGANIZATION / READABILITY</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>
						Entries are logged in a table of contents. There is an overall organization to the document that makes it easy to reference,
						such as color coded entries, tabs for key sections, or other markers. <u>
							Notebook contains little to no extraneous content that does not further the engineering design process.
						</u>
					</div>
					<div>
						Entries are logged in a table of contents. There is some organization to the document to enhance readability. <u>
							Notebook contains some extraneous content that does not further the design process, but it does not severely impact
							readability.
						</u>
					</div>
					<div>
						Entries are not logged in a table of contents, and there is little adherence to a system of organization. <u>
							Excessive extraneous content makes the notebook difficult to read, use, or understand.
						</u>
					</div>
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
				<p class="text-sm font-bold">RECORD OF TEAM & PROJECT MANAGEMENT</p>
			</criteria>
			<scroll-container use:rsc2>
				<content class="min-w-120">
					<div>
						Provides a <u>complete record of team and project assignments;</u> contains team meeting notes including goals, decisions, and building/programming
						accomplishments; design cycles are easily identified. Resource constraints including time and materials are noted throughout. Notebook
						has evidence that documentation was done in sequence with the design process. Entries include dates and names of contributing students.
					</div>
					<div>
						Records <u>most of the information listed</u> at the left. Level of detail is inconsistent, or some aspects are missing. There are
						significant gaps in the overall record of the design process. Notebook may have inconsistent evidence of dates of entries and student
						contributions.
					</div>
					<div>
						<u>Does not record the design process in a way that shows team progress.</u> There are significant gaps or missing information for
						key design aspects. Notebook has little evidence of dates of entries and student contributions.
					</div>
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
				<p class="text-sm font-bold">INNOVATE AWARD NOTES (optional):</p>
				<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={innovateAwardNotes} readonly={isSubmitted}
				></textarea>
			</div>
			<scoring class="flex-col! min-w-14 max-w-14 gap-2">
				<p>TOTAL<br />SCORE</p>
				<p class="text-lg">{totalScore}</p>
			</scoring>
		</row>
	</rubric-body>
</rubric-table>
