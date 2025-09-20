<script lang="ts">
	import { app, tabs } from '$lib/app-page.svelte';
	import { AwardNominationTab, AwardRankingTab, NotebookRubricTab, NotebookSortingTab, TeamInterviewRubricTab } from '$lib/tab.svelte';
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
							<svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
								/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
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
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
								/>
							</svg>
						</div>
						<div>
							<div class="font-medium">Award Nomination</div>
							<div class="text-sm text-gray-500">Nominate teams for awards</div>
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
