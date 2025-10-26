<script lang="ts">
	import { app, dialogs, subscriptions, tabs } from '$lib/index.svelte';
	import {
		AwardNominationTab,
		AwardRankingTab,
		AwardWinnerTab,
		FinalAwardRankingTab,
		NotebookRubricTab,
		NotebookSortingTab,
		TeamAttendanceTab,
		TeamInterviewRubricTab,
		ExcellenceAwardCandidatesTab
	} from '$lib/tab.svelte';
	import TeamsRubricsList from './TeamsRubricsList.svelte';
	import { gtag } from '$lib/index.svelte';

	interface Props {
		isActive: boolean;
	}

	let { isActive }: Props = $props();

	const currentUser = $derived(app.getCurrentUser());
	const isJudgeAdvisor = $derived(currentUser?.role === 'judge_advisor');
	const essentialData = $derived(app.getEssentialData());
	const judgingStep = $derived(essentialData?.judgingStep || 'beginning');
	const isAwardDeliberationStarted = $derived(judgingStep === 'award_deliberations');

	function addTeamInterviewTab() {
		tabs.addOrReuseTab(new TeamInterviewRubricTab({ teamId: '' }));
	}

	function addNotebookReviewTab() {
		tabs.addOrReuseTab(new NotebookRubricTab({ teamId: '' }));
	}

	function addNotebookSortingTab() {
		tabs.addOrReuseTab(new NotebookSortingTab());
	}

	function addAwardNominationTab() {
		tabs.addOrReuseTab(new AwardNominationTab());
	}

	function addExcellenceAwardEligibilityTab() {
		tabs.addOrReuseTab(new ExcellenceAwardCandidatesTab());
	}

	function addAwardRankingTab() {
		tabs.addOrReuseTab(new AwardRankingTab());
	}

	function addFinalRankingTab() {
		tabs.addOrReuseTab(new FinalAwardRankingTab());
	}

	function addAwardWinnerTab() {
		tabs.addOrReuseTab(new AwardWinnerTab());
	}

	function addTeamAttendanceTab() {
		tabs.addOrReuseTab(new TeamAttendanceTab());
	}

	async function startAwardDeliberation() {
		const confirmed = await dialogs.showConfirmation({
			title: 'Start Award Deliberation',
			message:
				'This will unlock award deliberation functions for all judges for the last step in the judging process. Rubrics can still be submitted. Please confirm to proceed.',
			confirmText: 'Start Deliberation',
			cancelText: 'Cancel',
			confirmButtonClass: 'primary'
		});

		if (!confirmed) {
			return;
		}

		gtag('event', 'start_award_deliberation', {
			divisionId: essentialData?.divisionId,
			awardCount: essentialData?.awards.length,
			teamCount: essentialData?.teamInfos.length,
			judgeGroupCount: essentialData?.judgeGroups.length,
			judgeCount: app.getJudgeCount(),
			judgingMethod: essentialData?.judgingMethod,
			isImportingFromRobotEvents: essentialData?.robotEventsSku && essentialData?.robotEventsEventId && essentialData?.divisionId,
			submissionCount: Object.values(subscriptions.allSubmissionCaches).length
		});

		try {
			await app.wrpcClient.judging.startAwardDeliberation.mutation();
			app.addSuccessNotice('Award deliberation started! All judges can now access award deliberation functions.');
		} catch (error) {
			console.error('Failed to start award deliberation:', error);
			app.addErrorNotice('Failed to start award deliberation');
		}
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Event Overview -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-2 text-lg font-medium text-gray-900">Event Overview</h2>
			{#if essentialData}
				<div class="text-sm text-gray-500">
					<!-- <p>Event Name: {essentialData.eventName}</p> -->
					<p>
						Event Code:
						{#if essentialData.robotEventsSku}
							<a
								href={`https://robotevents.com/robot-competitions/link-to/${essentialData.robotEventsSku}.html`}
								target="_blank"
								class="text-blue-500 hover:text-blue-600">{essentialData.robotEventsSku}</a
							>
						{:else}
							(Not set)
						{/if}
					</p>
					<p>Division: {essentialData.divisionId ?? '(Not set)'}</p>
					<p>The number of teams: {essentialData.teamInfos.length}</p>
					<p>The number of judge groups: {essentialData.judgeGroups.length}</p>
					<p>The number of judges: {app.getJudgeCount()}</p>
				</div>
			{/if}
		</div>

		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="text-lg font-medium text-gray-900">Start</h2>
			<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<button
					onclick={addTeamAttendanceTab}
					class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
				>
					<div class="rounded-full bg-slate-300 p-2">
						<svg class="h-5 w-5 text-slate-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
							><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
								d="M197.8 100.3C208.7 107.9 211.3 122.9 203.7 133.7L147.7 213.7C143.6 219.5 137.2 223.2 130.1 223.8C123 224.4 116 222 111 217L71 177C61.7 167.6 61.7 152.4 71 143C80.3 133.6 95.6 133.7 105 143L124.8 162.8L164.4 106.2C172 95.3 187 92.7 197.8 100.3zM197.8 260.3C208.7 267.9 211.3 282.9 203.7 293.7L147.7 373.7C143.6 379.5 137.2 383.2 130.1 383.8C123 384.4 116 382 111 377L71 337C61.6 327.6 61.6 312.4 71 303.1C80.4 293.8 95.6 293.7 104.9 303.1L124.7 322.9L164.3 266.3C171.9 255.4 186.9 252.8 197.7 260.4zM288 160C288 142.3 302.3 128 320 128L544 128C561.7 128 576 142.3 576 160C576 177.7 561.7 192 544 192L320 192C302.3 192 288 177.7 288 160zM288 320C288 302.3 302.3 288 320 288L544 288C561.7 288 576 302.3 576 320C576 337.7 561.7 352 544 352L320 352C302.3 352 288 337.7 288 320zM224 480C224 462.3 238.3 448 256 448L544 448C561.7 448 576 462.3 576 480C576 497.7 561.7 512 544 512L256 512C238.3 512 224 497.7 224 480zM128 440C150.1 440 168 457.9 168 480C168 502.1 150.1 520 128 520C105.9 520 88 502.1 88 480C88 457.9 105.9 440 128 440z"
							/></svg
						>
					</div>
					<div>
						<div class="font-medium">Team Attendance</div>
						<div class="text-sm text-gray-500">Mark teams present or absent</div>
					</div>
				</button>

				<button
					onclick={addNotebookSortingTab}
					class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
				>
					<div class="rounded-full bg-slate-300 p-2">
						<svg
							class="h-5 w-5 text-slate-600"
							fill="currentColor"
							stroke="currentColor"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 640 640"
							><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
								d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z"
							/></svg
						>
					</div>
					<div>
						<div class="font-medium">Notebook Sorting</div>
						<div class="text-sm text-gray-500">Sort the engineering notebooks</div>
					</div>
				</button>

				<button
					onclick={addNotebookReviewTab}
					class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
				>
					<div class="rounded-full bg-slate-300 p-2">
						<svg
							class="h-5 w-5 text-slate-600"
							fill="currentColor"
							stroke="currentColor"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 640 640"
							><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
								d="M480 576L192 576C139 576 96 533 96 480L96 160C96 107 139 64 192 64L496 64C522.5 64 544 85.5 544 112L544 400C544 420.9 530.6 438.7 512 445.3L512 512C529.7 512 544 526.3 544 544C544 561.7 529.7 576 512 576L480 576zM192 448C174.3 448 160 462.3 160 480C160 497.7 174.3 512 192 512L448 512L448 448L192 448zM224 216C224 229.3 234.7 240 248 240L424 240C437.3 240 448 229.3 448 216C448 202.7 437.3 192 424 192L248 192C234.7 192 224 202.7 224 216zM248 288C234.7 288 224 298.7 224 312C224 325.3 234.7 336 248 336L424 336C437.3 336 448 325.3 448 312C448 298.7 437.3 288 424 288L248 288z"
							/></svg
						>
					</div>
					<div>
						<div class="font-medium">Notebook Review</div>
						<div class="text-sm text-gray-500">Review engineering notebooks</div>
					</div>
				</button>

				<button
					onclick={addTeamInterviewTab}
					class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
				>
					<div class="rounded-full bg-slate-300 p-2">
						<svg
							class="h-5 w-5 text-slate-600"
							fill="currentColor"
							stroke="currentColor"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 640 640"
							><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
								d="M416 208C416 305.2 330 384 224 384C197.3 384 171.9 379 148.8 370L67.2 413.2C57.9 418.1 46.5 416.4 39 409C31.5 401.6 29.8 390.1 34.8 380.8L70.4 313.6C46.3 284.2 32 247.6 32 208C32 110.8 118 32 224 32C330 32 416 110.8 416 208zM416 576C321.9 576 243.6 513.9 227.2 432C347.2 430.5 451.5 345.1 463 229.3C546.3 248.5 608 317.6 608 400C608 439.6 593.7 476.2 569.6 505.6L605.2 572.8C610.1 582.1 608.4 593.5 601 601C593.6 608.5 582.1 610.2 572.8 605.2L491.2 562C468.1 571 442.7 576 416 576z"
							/></svg
						>
					</div>
					<div>
						<div class="font-medium">Team Interview</div>
						<div class="text-sm text-gray-500">Conduct team interviews</div>
					</div>
				</button>

				<button
					onclick={addAwardRankingTab}
					class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
				>
					<div class="rounded-full bg-slate-300 p-2">
						<svg
							class="h-5 w-5 text-slate-600"
							fill="currentColor"
							stroke="currentColor"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 640 640"
							><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
								d="M353.8 118.1L330.2 70.3C326.3 62 314.1 61.7 309.8 70.3L286.2 118.1L233.9 125.6C224.6 127 220.6 138.5 227.5 145.4L265.5 182.4L256.5 234.5C255.1 243.8 264.7 251 273.3 246.7L320.2 221.9L366.8 246.3C375.4 250.6 385.1 243.4 383.6 234.1L374.6 182L412.6 145.4C419.4 138.6 415.5 127.1 406.2 125.6L353.9 118.1zM288 320C261.5 320 240 341.5 240 368L240 528C240 554.5 261.5 576 288 576L352 576C378.5 576 400 554.5 400 528L400 368C400 341.5 378.5 320 352 320L288 320zM80 384C53.5 384 32 405.5 32 432L32 528C32 554.5 53.5 576 80 576L144 576C170.5 576 192 554.5 192 528L192 432C192 405.5 170.5 384 144 384L80 384zM448 496L448 528C448 554.5 469.5 576 496 576L560 576C586.5 576 608 554.5 608 528L608 496C608 469.5 586.5 448 560 448L496 448C469.5 448 448 469.5 448 496z"
							/></svg
						>
					</div>
					<div>
						<div class="font-medium">Award Ranking</div>
						<div class="text-sm text-gray-500">Rank teams for awards</div>
					</div>
				</button>

				<!-- Award Deliberation Start Button (Judge Advisor Only, Before Deliberation Starts) -->
				{#if isJudgeAdvisor && !isAwardDeliberationStarted}
					<button
						onclick={startAwardDeliberation}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
					>
						<div class="rounded-full bg-slate-300 p-2">
							<svg class="h-5 w-5 text-slate-600" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
								><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
									d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z"
								/></svg
							>
						</div>
						<div>
							<div class="font-medium">Start Award Deliberation</div>
							<div class="text-sm text-gray-500">Begin the the last step of judging</div>
						</div>
					</button>
				{/if}

				<!-- Award Functions (Only show when award deliberation has started) -->
				{#if isAwardDeliberationStarted}
					<button
						onclick={addAwardNominationTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
					>
						<div class="rounded-full bg-slate-300 p-2">
							<svg
								class="h-5 w-5 text-slate-600"
								fill="currentColor"
								stroke="currentColor"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 640 640"
								><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
									d="M584 352C597.3 352 608 362.7 608 376L608 480C608 515.3 579.3 544 544 544L96 544C60.7 544 32 515.3 32 480L32 376C32 362.7 42.7 352 56 352C69.3 352 80 362.7 80 376L80 480C80 488.8 87.2 496 96 496L544 496C552.8 496 560 488.8 560 480L560 376C560 362.7 570.7 352 584 352zM448 96C483.3 96 512 124.7 512 160L512 384C512 419.3 483.3 448 448 448L192 448C156.7 448 128 419.3 128 384L128 160C128 124.7 156.7 96 192 96L448 96zM410.9 180.6C400.2 172.8 385.2 175.2 377.4 185.9L291.8 303.6L265.3 276.2C256.1 266.7 240.9 266.4 231.4 275.6C221.9 284.8 221.6 300 230.8 309.5L277.2 357.5C282.1 362.6 289 365.3 296.1 364.8C303.2 364.3 309.7 360.7 313.9 355L416.2 214.1C424 203.4 421.6 188.4 410.9 180.6z"
								/></svg
							>
						</div>
						<div>
							<div class="font-medium">Award Nomination</div>
							<div class="text-sm text-gray-500">Nominate teams for awards</div>
						</div>
					</button>

					<button
						onclick={addExcellenceAwardEligibilityTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
					>
						<div class="rounded-full bg-slate-300 p-2">
							<svg class="h-5 w-5 text-slate-600" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
								><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
									d="M64 136C64 122.8 74.7 112 88 112L136 112C149.3 112 160 122.7 160 136L160 240L184 240C197.3 240 208 250.7 208 264C208 277.3 197.3 288 184 288L88 288C74.7 288 64 277.3 64 264C64 250.7 74.7 240 88 240L112 240L112 160L88 160C74.7 160 64 149.3 64 136zM94.4 365.2C105.8 356.6 119.7 352 134 352L138.9 352C172.6 352 200 379.4 200 413.1C200 432.7 190.6 451 174.8 462.5L150.8 480L184 480C197.3 480 208 490.7 208 504C208 517.3 197.3 528 184 528L93.3 528C77.1 528 64 514.9 64 498.7C64 489.3 68.5 480.5 76.1 475L146.6 423.7C150 421.2 152 417.3 152 413.1C152 405.9 146.1 400 138.9 400L134 400C130.1 400 126.3 401.3 123.2 403.6L102.4 419.2C91.8 427.2 76.8 425 68.8 414.4C60.8 403.8 63 388.8 73.6 380.8L94.4 365.2zM288 128L544 128C561.7 128 576 142.3 576 160C576 177.7 561.7 192 544 192L288 192C270.3 192 256 177.7 256 160C256 142.3 270.3 128 288 128zM288 288L544 288C561.7 288 576 302.3 576 320C576 337.7 561.7 352 544 352L288 352C270.3 352 256 337.7 256 320C256 302.3 270.3 288 288 288zM288 448L544 448C561.7 448 576 462.3 576 480C576 497.7 561.7 512 544 512L288 512C270.3 512 256 497.7 256 480C256 462.3 270.3 448 288 448z"
								/></svg
							>
						</div>
						<div>
							<div class="font-medium">Excellence Award Candidates</div>
							<div class="text-sm text-gray-500">Check the eligibility of each team</div>
						</div>
					</button>

					<button
						onclick={addFinalRankingTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
					>
						<div class="rounded-full bg-slate-300 p-2">
							<svg
								class="h-5 w-5 text-slate-600"
								fill="currentColor"
								stroke="currentColor"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 640 640"
								><!--!Font Awesome Free 7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
									d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z"
								/></svg
							>
						</div>
						<div>
							<div class="font-medium">Final Ranking</div>
							<div class="text-sm text-gray-500">Final award rankings</div>
						</div>
					</button>

					<button
						onclick={addAwardWinnerTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
					>
						<div class="rounded-full bg-slate-300 p-2">
							<svg
								class="h-5 w-5 text-slate-600"
								fill="currentColor"
								stroke="currentColor"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 640 640"
								><!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
									d="M208.3 64L432.3 64C458.8 64 480.4 85.8 479.4 112.2C479.2 117.5 479 122.8 478.7 128L528.3 128C554.4 128 577.4 149.6 575.4 177.8C567.9 281.5 514.9 338.5 457.4 368.3C441.6 376.5 425.5 382.6 410.2 387.1C390 415.7 369 430.8 352.3 438.9L352.3 512L416.3 512C434 512 448.3 526.3 448.3 544C448.3 561.7 434 576 416.3 576L224.3 576C206.6 576 192.3 561.7 192.3 544C192.3 526.3 206.6 512 224.3 512L288.3 512L288.3 438.9C272.3 431.2 252.4 416.9 233 390.6C214.6 385.8 194.6 378.5 175.1 367.5C121 337.2 72.2 280.1 65.2 177.6C63.3 149.5 86.2 127.9 112.3 127.9L161.9 127.9C161.6 122.7 161.4 117.5 161.2 112.1C160.2 85.6 181.8 63.9 208.3 63.9zM165.5 176L113.1 176C119.3 260.7 158.2 303.1 198.3 325.6C183.9 288.3 172 239.6 165.5 176zM444 320.8C484.5 297 521.1 254.7 527.3 176L475 176C468.8 236.9 457.6 284.2 444 320.8z"
								/></svg
							>
						</div>
						<div>
							<div class="font-medium">Award Winners</div>
							<div class="text-sm text-gray-500">View and manage award winners</div>
						</div>
					</button>
				{/if}
			</div>
		</div>
		<!-- Teams List with Rubric Submissions -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<TeamsRubricsList />
		</div>
	</div>
</div>
