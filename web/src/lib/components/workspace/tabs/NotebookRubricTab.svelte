<script lang="ts">
	import './rubric.css';
	import { app } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';
	import type { NotebookRubricTab } from '$lib/tab.svelte';
	import ScoreButtons from './ScoreButtons.svelte';

	interface Props {
		tab: NotebookRubricTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	// Get essential data for teams and judge groups
	const allTeams = $derived(app.getAllTeams());
	const allTeamsData = $derived(app.getAllTeamData());
	const currentUser = $derived(app.getCurrentUser());
	const essentialData = $derived(app.getEssentialData());

	// Use current user's judge information with reactive validation
	const currentJudge = $derived(() => {
		if (!currentUser || currentUser.role !== 'judge') {
			throw new Error('CRITICAL: NotebookRubricTab can only be accessed by judges');
		}
		return currentUser.judge;
	});

	// Check if the event uses assigned judging method
	const isAssignedJudging = $derived(essentialData?.judgingMethod === 'assigned');

	// Get current judge's group
	const currentJudgeGroup = $derived(() => {
		if (!currentJudge()) return null;
		return app.getCurrentUserJudgeGroup(currentJudge().id);
	});

	// State for showing only assigned teams
	let showOnlyAssignedTeams = $state(true);

	// Local state for the rubric form (no judge selection needed)
	let selectedTeamId = $state(tab.teamId || '');
	let rubricScores = $state<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let notes = $state('');
	let innovateAwardNotes = $state('');

	// Scroll container references for synchronization
	let scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

	// Get teams to display based on filter and sort by isDevelopedNotebook
	const teamsToShow = $derived(() => {
		let teams = [...allTeams];
		
		if (isAssignedJudging && showOnlyAssignedTeams && currentJudgeGroup()) {
			// Filter to only show assigned teams for current judge group
			const assignedTeamIds = new Set(currentJudgeGroup()!.assignedTeams);
			teams = teams.filter(team => assignedTeamIds.has(team.id));
		}
		
		// Sort teams: isDevelopedNotebook = true first, then by team numbers
		return teams.sort((a, b) => {
			const aData = allTeamsData[a.id];
			const bData = allTeamsData[b.id];
			const aIsDeveloped = aData?.isDevelopedNotebook ?? null;
			const bIsDeveloped = bData?.isDevelopedNotebook ?? null;
			
			// Sort by isDevelopedNotebook: true first, then false, then null
			if (aIsDeveloped !== bIsDeveloped) {
				if (aIsDeveloped === true) return -1;
				if (bIsDeveloped === true) return 1;
				if (aIsDeveloped === false) return -1;
				if (bIsDeveloped === false) return 1;
			}
			
			// Then sort by team number
			return a.number.localeCompare(b.number);
		});
	});

	// Get the selected team details
	const selectedTeam = $derived(allTeams.find((team) => team.id === selectedTeamId));
	const selectedTeamData = $derived(allTeamsData[selectedTeamId]);

	// Calculate total score
	const totalScore = $derived.by(() => {
		if (rubricScores.find((score) => score === -1)) {
			return 'N/A';
		} else {
			return rubricScores.reduce((sum, score) => sum + score, 0).toString();
		}
	});

	async function saveRubric() {
		if (!selectedTeamId) {
			alert('Please select a team');
			return;
		}

		// TODO: Implement actual save functionality via WRPC
		console.log('Saving notebook rubric:', {
			teamId: selectedTeamId,
			judgeId: currentJudge().id
		});

		alert('Notebook rubric saved successfully! (This is a placeholder)');
	}

	// Synchronize scroll positions across all containers
	function syncScrollPosition(sourceContainer: HTMLElement) {
		if (isSyncing) return; // Prevent infinite loop

		isSyncing = true;
		const scrollLeft = sourceContainer.scrollLeft;

		scrollContainers.forEach((container) => {
			if (container !== sourceContainer) {
				container.scrollLeft = scrollLeft;
			}
		});

		// Use setTimeout to reset the flag after all scroll events have been processed
		setTimeout(() => {
			isSyncing = false;
		}, 0);
	}

	// Register scroll container and add event listener
	function registerScrollContainer(container: HTMLElement) {
		if (!scrollContainers.includes(container)) {
			scrollContainers.push(container);
			container.addEventListener('scroll', () => syncScrollPosition(container));
		}
	}
</script>

<Tab {isActive} tabId={tab.id} tabType={tab.type}>
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Header -->

			<div class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">Notebook Review</h2>
				
				<!-- Filter Controls -->
				{#if isAssignedJudging}
					<div class="mb-4">
						<label class="flex items-center">
							<input 
								type="checkbox" 
								bind:checked={showOnlyAssignedTeams}
								class="mr-2 rounded border-gray-300"
							>
							<span class="text-sm text-gray-700">
								Only show assigned teams for your current judge group
								{#if currentJudgeGroup()}
									({currentJudgeGroup()!.name})
								{/if}
							</span>
						</label>
					</div>
				{/if}
				
				<div class="mb-4">
					<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700"><strong>Team #</strong></label>
					<select id="team-select" bind:value={selectedTeamId} class="classic mt-1 block w-full">
						<option value="">Select a team...</option>
						{#each teamsToShow() as team (team.id)}
							{@const teamData = allTeamsData[team.id]}
							{@const isDeveloped = teamData?.isDevelopedNotebook ?? null}
							{@const statusText = isDeveloped === true ? ' (Fully Developed)' : isDeveloped === false ? ' (Developing)' : ''}
							<option value={team.id}>{team.number} - {team.name}{statusText}</option>
						{/each}
					</select>
				</div>

				{#if selectedTeam}
					{@const notebookLink = selectedTeamData?.notebookLink || '(Not provided)'}
					<div class="mb-4 rounded-lg bg-gray-50 p-4">
						<div class=" text-sm text-gray-800">
							<p><strong>Team #{selectedTeam.number}:</strong> {selectedTeam.name}</p>
							<p><strong>School:</strong> {selectedTeam.school}</p>
							<p><strong>Grade Level:</strong> {selectedTeam.grade}</p>
							<p>
								<strong>Notebook Link:</strong>
								{#if notebookLink === '(Not provided)'}
									{notebookLink}
								{:else}
									<a class="text-blue-500 hover:text-blue-600" href={notebookLink} target="_blank">{notebookLink}</a>
								{/if}
							</p>
						</div>
					</div>
				{/if}

				<!-- Current Judge Information (Read-only) -->
				<div class="mt-2 text-sm text-gray-700">
					<p><strong>Judge Name:{' '}</strong>{currentJudge().name}</p>
				</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<p class="mb-2 text-sm text-gray-600">
					<strong>Directions:</strong> Determine the point value that best characterizes the content of the Engineering Notebook for that criterion.
					Write that value in the column to the right. This rubric is to be used for all Engineering Notebooks regardless of format (physical
					or digital). Please refer to Section 5 of the Guide to Judging for information on how to use this rubric.
				</p>
				<p class="mb-6 text-sm text-gray-600">
					<strong>Notes:</strong> Any student-centered or academic honesty concerns, such as plagiarism, should be brought to the attention of
					the Judge Advisor and/or Event Partner.
				</p>
				<!--  hidden for test only -->
				<rubric-table>
					<rubric-header>
						<div class="flex max-w-42 min-w-42 flex-grow flex-col items-stretch justify-center bg-gray-400 p-0 text-center font-bold">
							<div class="flex-1 flex-grow border-b-3 bg-gray-200">CRITERIA</div>
							<div class="pt-1 pb-1 leading-none">ENGINEERING DESIGN PROCESS</div>
						</div>
						<scroll-container use:registerScrollContainer>
							<content class="min-w-120 flex-col! gap-2 bg-gray-200">
								<div class="p-0! pt-1 text-center text-base font-bold">PROFICIENCY LEVEL</div>
								<div class="flex border-0! p-0! text-center">
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
						<scoring class="min-w-14 flex-col! bg-gray-200">
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
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Clearly <u>identifies</u> the problem / design goal(s) <u>in detail at the start of each design process cycle</u>. This
										can include elements of game strategy, robot design, or programming, and should include a clear definition and
										justification of the design goal(s), criteria, and constraints.
									</div>
									<div>
										Identifies the problem / design goal(s) at the start of each design cycle but is <u>lacking details or justification</u
										>.
									</div>
									<div><u>Does not identify the problem / design goal(s)</u> at the start of each design cycle.</div>
								</content>
							</scroll-container>
							<scoring class="max-w-14 min-w-14">
								<ScoreButtons bind:variable={rubricScores[0]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">BRAINSTORM SOLUTIONS</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<u>Explores several different solutions</u> with explanation. Citations are provided for ideas that came from outside sources
										such as online videos or other teams.
									</div>
									<div><u>Explores few solutions</u>. Citations provided for ideas that came from outside sources.</div>
									<div><u>Does not explore different solutions</u> or solutions are recorded with <u>little explanation</u>.</div>
								</content>
							</scroll-container>
							<scoring class="max-w-14 min-w-14">
								<ScoreButtons bind:variable={rubricScores[1]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">SELECT BEST SOLUTION</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<u
											>Fully explains the “why” behind design decisions in each step of the design process for all significant aspects of a
											team’s design.
										</u>
									</div>
									<div><u>Inconsistently explains the “why” behind design decisions</u>.</div>
									<div><u>Minimally explains the “why” behind design decisions.</u></div>
								</content>
							</scroll-container>
							<scoring class="max-w-14 min-w-14">
								<ScoreButtons bind:variable={rubricScores[2]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">BUILD AND PROGRAM THE SOLUTION</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Records the steps the team took to build and program the solution. Includes
										<u>enough detail that the reader can follow the logic</u> used by the team to develop their robot design, as well as recreate
										the robot design from the documentation.
									</div>
									<div>
										Records the key steps to build and program the solution but <u>
											lacks sufficient detail for the reader to follow their process.
										</u>
									</div>
									<div><u>Does not record the key steps</u> to build and program the solution.</div>
								</content>
							</scroll-container>
							<scoring class="max-w-14 min-w-14">
								<ScoreButtons bind:variable={rubricScores[3]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ORIGINAL TESTING OF SOLUTIONS</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<u>Records all the steps</u> to test the solution, including test results. Testing methodology is clearly explained, and
										the testing is <u>done by the team</u>. <u>Original</u> testing results are explained and conclusions are drawn from that
										data.
									</div>
									<div>
										<u>Records the key steps</u> to test the solution. Testing methodology may be incomplete, or incomplete conclusions are recorded.
									</div>
									<div><u>Does not record steps</u> to test the solution. Testing or results are borrowed from another team’s work.</div>
								</content>
							</scroll-container>
							<scoring class="max-w-14 min-w-14">
								<ScoreButtons bind:variable={rubricScores[4]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">REPEAT DESIGN PROCESS</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Shows that the <u>design process is repeated multiple times</u> to work towards a design goal. This includes a clear definition
										and justification of the design goal(s), its criteria, and constraints. The notebook shows setbacks that the team learned
										from, and shows design alternatives that were considered but not pursued.
									</div>
									<div>
										<u>Design process is not often repeated</u> for design goals or robot/game performance. The notebook does not show alternate
										lines of inquiry, setbacks, or other learning experiences.
									</div>
									<div>
										<u>Does not show that the design process is repeated</u>. Does not show setbacks or failures, or seems to be curated to
										craft a narrative.
									</div>
								</content>
							</scroll-container>
							<scoring class="max-w-14 min-w-14">
								<ScoreButtons bind:variable={rubricScores[5]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row class="border-t-3! bg-gray-100">
							<div class="p-2">
								<p class="text-sm font-bold">NOTES:</p>
								<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={notes}></textarea>
							</div>
							<scoring class="max-w-14 min-w-14"></scoring>
						</row>
					</rubric-body>
				</rubric-table>
				<!--  -->
				<rubric-table class="mt-6">
					<rubric-header>
						<div class="flex max-h-42 min-h-20 flex-grow items-center justify-center text-center text-2xl font-bold">
							Engineering Notebook Rubric (Page 2 of 2)
						</div>
					</rubric-header>
					<rubric-header>
						<criteria class="max-w-42 min-w-42 bg-gray-400">
							<p class="text-sm font-bold">ENGINEERING NOTEBOOK FORMAT AND CONTENT</p>
						</criteria>
						<scroll-container use:registerScrollContainer class="flex items-stretch bg-gray-200">
							<content class="min-w-120 flex-col! gap-2">
								<div class="flex border-0! p-0! text-center">
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
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Team shows evidence of independent inquiry <u>from the beginning stages</u> of their design process. Notebook documents whether
										the implemented ideas have their origin with students on the team, or if students found inspiration elsewhere.
									</div>
									<div>
										Team shows evidence of independent inquiry for <u>some elements</u> of their design process. Ideas and information from outside
										the team are documented.
									</div>
									<div>
										Team <u>shows little to no evidence</u> of independent inquiry in their design process. Ideas from outside the team are not
										properly credited. Ideas or designs appear with no evidence of process.
									</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								<ScoreButtons bind:variable={rubricScores[6]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">USABILITY & COMPLETENESS</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										<u>Records the entire design and development process</u> with enough clarity and detail that the reader could recreate the
										project’s history. Notebook has recent entries that align with the robot the team has brought to the event.
									</div>
									<div>
										Records the design and development process completely but <u>lacks sufficient detail</u>. Documentation is inconsistent
										with possible gaps.
									</div>
									<div>
										<u>Lacks sufficient detail</u> to understand the design process. Notebook has large gaps in time, or does not align with
										the robot the team has brought to the event.
									</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								<ScoreButtons bind:variable={rubricScores[7]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ORIGINALITY & QUALITY</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Cited content is kept to relevant information and all cited content longer than a paragraph is located in appendices to
										the Engineering Notebook. Information originating from outside the team is always properly cited in the notebook with
										the source and date accessed. <u>Most or all Engineering Notebook content is original to the submitting team members.</u
										>
									</div>
									<div>
										<u>
											Cited content is mostly kept to relevant information. Information originating from outside the team is properly
											credited.
										</u> Cited content is paraphrased with some original content describing the team’s design process.
									</div>
									<div>
										<u>Cited content is excessive and/or is not kept in appendices, or non-original content is not cited.</u> Plagiarised content
										should be noted to the JA and through the REC Foundation Code of Conduct process.
									</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								<ScoreButtons bind:variable={rubricScores[8]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">ORGANIZATION / READABILITY</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Entries are logged in a table of contents. There is an overall organization to the document that makes it easy to
										reference, such as color coded entries, tabs for key sections, or other markers. <u>
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
								<ScoreButtons bind:variable={rubricScores[9]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<criteria class="max-w-42 min-w-42">
								<p class="text-sm font-bold">RECORD OF TEAM & PROJECT MANAGEMENT</p>
							</criteria>
							<scroll-container use:registerScrollContainer>
								<content class="min-w-120">
									<div>
										Provides a <u>complete record of team and project assignments;</u> contains team meeting notes including goals, decisions,
										and building/programming accomplishments; design cycles are easily identified. Resource constraints including time and materials
										are noted throughout. Notebook has evidence that documentation was done in sequence with the design process. Entries include
										dates and names of contributing students.
									</div>
									<div>
										Records <u>most of the information listed</u> at the left. Level of detail is inconsistent, or some aspects are missing.
										There are significant gaps in the overall record of the design process. Notebook may have inconsistent evidence of dates
										of entries and student contributions.
									</div>
									<div>
										<u>Does not record the design process in a way that shows team progress.</u> There are significant gaps or missing information
										for key design aspects. Notebook has little evidence of dates of entries and student contributions.
									</div>
								</content>
							</scroll-container>
							<scoring class="min-w-14">
								<ScoreButtons bind:variable={rubricScores[10]} />
								<!-- <p class="text-lg">{q1}</p> -->
							</scoring>
						</row>
						<row>
							<div class="p-2">
								<p class="text-sm font-bold">INNOVATE AWARD NOTES (optional):</p>
								<textarea class="mt-2 block h-20 min-h-20 w-full border border-gray-300 p-1" bind:value={innovateAwardNotes}></textarea>
							</div>
							<scoring class="max-w-14 min-w-14 flex-col! gap-2">
								<p>TOTAL<br />SCORE</p>
								<p class="text-lg">{totalScore}</p>
								<!-- TODO -->
							</scoring>
						</row>
					</rubric-body>
				</rubric-table>

				<p class="mt-2 text-center text-xs italic">
					All judging materials are strictly confidential. They are not shared beyond the Judges and Judge Advisor and shall be destroyed at
					the end of the event.
				</p>
			</div>
		</div>
	</div>
</Tab>
