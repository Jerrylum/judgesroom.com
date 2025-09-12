<script lang="ts">
	import { app, tabs } from '$lib/app-page.svelte';
	import Header from './Header.svelte';
	import TabButton from './tabs/TabButton.svelte';
	import OverviewTab from './tabs/OverviewTab.svelte';
	import TeamInterviewRubricTab from './tabs/TeamInterviewRubricTab.svelte';
	import NotebookRubricTab from './tabs/NotebookRubricTab.svelte';
	import NotebookSortingTab from './tabs/NotebookSortingTab.svelte';
	import AwardRankingsTab from './tabs/AwardRankingsTab.svelte';

	// Get tab state
	const allTabs = $derived(tabs.allTabs);
	const activeTabId = $derived(tabs.activeTab);

	function switchTab(tabId: string) {
		tabs.switchToTab(tabId);
	}

	function closeTab(tabId: string) {
		tabs.closeTab(tabId);
	}
</script>

<div class="flex h-screen flex-col bg-gray-50">
	<!-- Header -->
	<Header />

	<!-- Tab Bar -->
	<div class="border-b bg-white">
		<div class="flex space-x-1 px-6">
			{#each allTabs as tab (tab.id)}
				<TabButton {tab} isActive={activeTabId === tab.id} onSwitch={() => switchTab(tab.id)} onClose={() => closeTab(tab.id)} />
			{/each}
		</div>
	</div>

	<!-- Main Content -->
	<main class="flex-1 overflow-hidden">
		{#each allTabs as tab (tab.id)}
			<div class="h-full" class:hidden={activeTabId !== tab.id}>
				{#if tab.type === 'overview'}
					<OverviewTab isActive={activeTabId === tab.id} />
				{:else if tab.type === 'team_interview_rubric'}
					<TeamInterviewRubricTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'notebook_rubric'}
					<NotebookRubricTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'notebook_sorting'}
					<NotebookSortingTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'award_rankings'}
					<AwardRankingsTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'custom' && 'component' in tab}
					{@const CustomComponent = tab.component}
					<CustomComponent {...tab.props} />
				{:else}
					<div class="flex items-center justify-center p-8 text-gray-500">
						<div class="text-center">
							<p>Unknown tab type: {(tab as any).type}</p>
							<p class="mt-2 text-sm">This tab type is not yet implemented.</p>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</main>
</div>
