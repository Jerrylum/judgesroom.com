<script lang="ts">
	import { app, tabs } from '$lib/app-page.svelte';
	import {
		AwardNominationTab,
		AwardRankingTab,
		AwardWinnerTab,
		FinalAwardRankingTab,
		NotebookRubricTab,
		NotebookSortingTab,
		TeamInterviewRubricTab
	} from '$lib/tab.svelte';
	import Tab from './Tab.svelte';
	import TeamsRubricsList from './TeamsRubricsList.svelte';

	interface Props {
		isActive: boolean;
	}

	let { isActive }: Props = $props();

	const currentUser = $derived(app.getCurrentUser());
	const isJudge = $derived(currentUser?.role === 'judge');

	function addTeamInterviewTab() {
		tabs.addTab(new TeamInterviewRubricTab({ teamId: '' }));
	}

	function addNotebookReviewTab() {
		tabs.addTab(new NotebookRubricTab({ teamId: '' }));
	}

	function addNotebookSortingTab() {
		tabs.addTab(new NotebookSortingTab());
	}

	function addAwardNominationTab() {
		// Check if an award nomination tab already exists
		const existingTab = tabs.findTab('award_nomination');
		if (existingTab) {
			// Switch to the existing tab instead of creating a new one
			tabs.switchToTab(existingTab.id);
		} else {
			// Create a new tab if none exists
			tabs.addTab(new AwardNominationTab());
		}
	}

	function addAwardRankingTab() {
		// Check if an award ranking tab already exists
		const existingTab = tabs.findTab('award_ranking');
		if (existingTab) {
			// Switch to the existing tab instead of creating a new one
			tabs.switchToTab(existingTab.id);
		} else {
			// Create a new tab if none exists
			tabs.addTab(new AwardRankingTab());
		}
	}

	function addFinalRankingTab() {
		// Check if a final ranking tab already exists
		const existingTab = tabs.findTab('final_award_ranking');
		if (existingTab) {
			// Switch to the existing tab instead of creating a new one
			tabs.switchToTab(existingTab.id);
		} else {
			// Create a new tab if none exists
			tabs.addTab(new FinalAwardRankingTab());
		}
	}

	function addAwardWinnerTab() {
		// Check if an award winner tab already exists
		const existingTab = tabs.findTab('award_winner');
		if (existingTab) {
			// Switch to the existing tab instead of creating a new one
			tabs.switchToTab(existingTab.id);
		} else {
			// Create a new tab if none exists
			tabs.addTab(new AwardWinnerTab());
		}
	}
</script>

<Tab {isActive} tabId="overview" tabType="overview">
	<div class="h-full overflow-auto p-6">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Event Overview -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-lg font-medium text-gray-900">Event Overview</h2>
				{#if app.hasEssentialData()}
					<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div class="rounded-lg bg-gray-50 p-4">
							<div class="text-2xl font-bold text-gray-900">
								{app.getTeamCount()}
							</div>
							<div class="text-sm text-gray-500">Teams</div>
						</div>
						<div class="rounded-lg bg-gray-50 p-4">
							<div class="text-2xl font-bold text-gray-900">
								{app.getJudgeGroupCount()}
							</div>
							<div class="text-sm text-gray-500">Judge Groups</div>
						</div>
						<div class="rounded-lg bg-gray-50 p-4">
							<div class="text-2xl font-bold text-gray-900">{app.getJudgeCount()}</div>
							<div class="text-sm text-gray-500">Judges</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-lg font-medium text-gray-900">Start</h2>
				<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<button
						onclick={addNotebookSortingTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-purple-100 p-2">
							<svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" d="M12 3v18" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M2 12l2 2 4-4" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M17 9l5 5m-5 0l5-5" />
							</svg>
						</div>
						<div>
							<div class="font-medium">Notebook Sorting</div>
							<div class="text-sm text-gray-500">Sort the engineering notebooks</div>
						</div>
					</button>

					<button
						onclick={addNotebookReviewTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-green-100 p-2">
							<svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div>
							<div class="font-medium">Notebook Review</div>
							<div class="text-sm text-gray-500">Review engineering notebooks</div>
						</div>
					</button>

					<button
						onclick={addTeamInterviewTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-blue-100 p-2">
							<svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								/>
							</svg>
						</div>
						<div>
							<div class="font-medium">Team Interview</div>
							<div class="text-sm text-gray-500">Conduct team interviews</div>
						</div>
					</button>

					<button
						onclick={addAwardRankingTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-yellow-100 p-2">
							<svg class="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
								/>
							</svg>
						</div>
						<div>
							<div class="font-medium">Award Ranking</div>
							<div class="text-sm text-gray-500">Rank teams for awards</div>
						</div>
					</button>

					<button
						onclick={addAwardNominationTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-orange-100 p-2">
							<svg class="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<div class="font-medium">Award Nomination</div>
							<div class="text-sm text-gray-500">Nominate teams for awards</div>
						</div>
					</button>

					<button
						onclick={addFinalRankingTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-purple-100 p-2">
							<svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M3 13h4v7H3v-7zm6-6h4v13H9V7zm6 3h4v10h-4V10z" />
							</svg>
						</div>
						<div>
							<div class="font-medium">Final Ranking</div>
							<div class="text-sm text-gray-500">Final award rankings</div>
						</div>
					</button>

					<button
						onclick={addAwardWinnerTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-emerald-100 p-2">
							<svg
								class="h-5 w-5 text-emerald-600"
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
				</div>
			</div>
			<!-- Teams List with Rubric Submissions -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<TeamsRubricsList />
			</div>
		</div>
	</div>
</Tab>
