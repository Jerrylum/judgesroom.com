<script lang="ts">
	import { app, tabs } from '$lib/app-page.svelte';
	import Tab from './Tab.svelte';

	interface Props {
		isActive: boolean;
	}

	let { isActive }: Props = $props();

	const currentUser = $derived(app.getCurrentUser());
	const isJudge = $derived(currentUser?.role === 'judge');

	// Quick action functions
	function addTeamInterviewTab() {
		if (!isJudge) {
			console.error('CRITICAL: Only judges can create team interview tabs');
			return;
		}
		tabs.addTeamInterviewRubricTab();
	}

	function addNotebookReviewTab() {
		if (!isJudge) {
			console.error('CRITICAL: Only judges can create notebook review tabs');
			return;
		}
		tabs.addNotebookRubricTab();
	}

	function addAwardRankingsTab() {
		tabs.addAwardRankingsTab();
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

			<!-- Quick Actions -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="text-lg font-medium text-gray-900">Quick Actions</h2>
				<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#if isJudge}
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
					{/if}

					<button
						onclick={addAwardRankingsTab}
						class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
					>
						<div class="rounded-full bg-yellow-100 p-2">
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
							<div class="font-medium">Award Rankings</div>
							<div class="text-sm text-gray-500">Rank teams for awards</div>
						</div>
					</button>
				</div>
			</div>
	</div>
	</div>
</Tab>
