<script lang="ts">
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import Header from './Header.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';

	// Tab system
	let activeTab = $state('overview');
	let tabs = $state([{ id: 'overview', title: 'Overview', closable: false }]);

	// async function handleClickShareSession() {
	// 	if (!app.isInSession()) {
	// 		AppUI.appPhase = 'session_setup';
	// 	} else {
	// 		await dialogs.showCustom(ShareDialog, {
	// 			props: {},
	// 			maxWidth: 'max-w-4xl'
	// 		});
	// 	}
	// }

	function addTab(title: string, id?: string) {
		const tabId = id || `tab-${Date.now()}`;
		tabs.push({ id: tabId, title, closable: true });
		activeTab = tabId;
	}

	function closeTab(tabId: string) {
		const index = tabs.findIndex((tab) => tab.id === tabId);
		if (index > -1 && tabs[index].closable) {
			tabs.splice(index, 1);
			if (activeTab === tabId) {
				activeTab = tabs[0]?.id || 'overview';
			}
		}
	}

	function switchTab(tabId: string) {
		activeTab = tabId;
	}
</script>

<div class="flex h-screen flex-col bg-gray-50">
	<!-- Header -->
	<Header />

	<!-- Tab Bar -->
	<div class="border-b bg-white">
		<div class="flex space-x-1 px-6">
			{#each tabs as tab (tab.id)}
				<button
					onclick={() => switchTab(tab.id)}
					class="flex items-center space-x-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
					class:border-indigo-500={activeTab === tab.id}
					class:text-indigo-600={activeTab === tab.id}
					class:border-transparent={activeTab !== tab.id}
					class:text-gray-500={activeTab !== tab.id}
					class:hover:text-gray-700={activeTab !== tab.id}
				>
					<span>{tab.title}</span>
					{#if tab.closable}
						<div
							onclick={(e) => {
								e.stopPropagation();
								closeTab(tab.id);
							}}
							class="ml-2 cursor-pointer rounded-full p-1 hover:bg-gray-200"
							role="button"
							tabindex="0"
							aria-label="Close tab"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									e.stopPropagation();
									closeTab(tab.id);
								}
							}}
						>
							<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Main Content -->
	<main class="flex-1 overflow-auto">
		{#if activeTab === 'overview'}
			<div class="p-6">
				<div class="mx-auto max-w-4xl space-y-6">
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
							<button
								onclick={() => addTab('Team Interview', 'team-interview')}
								class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
							>
								<div class="rounded-full bg-blue-100 p-2">
									<svg
										class="h-5 w-5 text-blue-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
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
								onclick={() => addTab('Notebook Review', 'notebook-review')}
								class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
							>
								<div class="rounded-full bg-green-100 p-2">
									<svg
										class="h-5 w-5 text-green-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
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
								onclick={() => addTab('Award Rankings', 'award-rankings')}
								class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left hover:bg-gray-50"
							>
								<div class="rounded-full bg-yellow-100 p-2">
									<svg
										class="h-5 w-5 text-yellow-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
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
		{:else}
			<div class="p-6">
				<div class="mx-auto max-w-4xl">
					<div class="rounded-lg bg-white p-6 shadow-sm">
						<h2 class="text-lg font-medium text-gray-900">
							{tabs.find((t) => t.id === activeTab)?.title || 'Unknown Tab'}
						</h2>
						<div class="mt-4 text-gray-600">
							<p>Tab content will be implemented here.</p>
							<p class="mt-2 text-sm">This is a placeholder for the {activeTab} functionality.</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>
