<script lang="ts">
	import { app, subscriptions, tabs } from '$lib/app-page.svelte';
	import Header from './Header.svelte';
	import TabBar from './TabBar.svelte';
	import OverviewTab from './tabs/OverviewTab.svelte';
	import TeamInterviewRubricTab from './tabs/TeamInterviewRubricTab.svelte';
	import NotebookRubricTab from './tabs/NotebookRubricTab.svelte';
	import NotebookSortingTab from './tabs/NotebookSortingTab.svelte';
	import AwardRankingTab from './tabs/AwardRankingTab.svelte';
	import AwardNominationTab from './tabs/AwardNominationTab.svelte';
	import FinalRankingTab from './tabs/FinalRankingTab.svelte';
	import AwardWinnerTab from './tabs/AwardWinnerTab.svelte';
	import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';
	import type { Tab } from '$lib/tab.svelte';

	// Get tab state
	const allTabs = $derived(tabs.allTabs);
	const activeTabId = $derived(tabs.activeTab);
	const isJudgingReady = $derived(app.isJudgingReady());
	const currentJudgeGroupId = $derived(app.getCurrentUserJudgeGroup()?.id ?? null);

	// Tab handlers
	function switchTab(tabId: string) {
		tabs.switchToTab(tabId);
	}

	function closeTab(tabId: string) {
		tabs.closeTab(tabId);
	}

	function reorderTabs(newOrder: Tab[]) {
		tabs.reorderTabs(newOrder);
	}

	$effect(() => {
		if (!isJudgingReady) return;

		// Listen to all judge groups if it is a judge advisor, otherwise listen to the current judge group
		const targetJudgeGroupIds = currentJudgeGroupId //
			? [currentJudgeGroupId]
			: app.getAllJudgeGroups().map((group) => group.id);

		console.log('Subscribing to award rankings', targetJudgeGroupIds);
		app.wrpcClient.judging.subscribeAwardRankings.mutation({ judgeGroupIds: targetJudgeGroupIds, exclusive: true }).then((data) => {
			subscriptions.allJudgeGroupsAwardRankings = data.reduce(
				(acc, curr) => {
					acc[curr.judgeGroupId] = curr;
					return acc;
				},
				{} as Record<string, AwardRankingsFullUpdate>
			);
		});

		return async () => {
			console.log('Unsubscribing from award rankings', targetJudgeGroupIds);

			await app.wrpcClient.judging.unsubscribeAwardRankings.mutation();
		};
	});

	$effect(() => {
		if (!isJudgingReady) return;

		console.log('Subscribing to reviewed teams', currentJudgeGroupId);

		// Listen to all judge groups if it is a judge advisor, otherwise listen to the current judge group
		const targetJudgeGroupIds = currentJudgeGroupId //
			? [currentJudgeGroupId]
			: app.getAllJudgeGroups().map((group) => group.id);

		app.wrpcClient.judging.subscribeReviewedTeams.mutation({ judgeGroupIds: targetJudgeGroupIds, exclusive: true }).then((data) => {
			subscriptions.allJudgeGroupsReviewedTeams = data.reduce(
				(acc, curr) => {
					acc[curr.judgeGroupId] = curr.teamIds;
					return acc;
				},
				{} as Record<string, string[]>
			);
		});

		return async () => {
			console.log('Unsubscribing from reviewed teams', targetJudgeGroupIds);

			await app.wrpcClient.judging.unsubscribeReviewedTeams.mutation();
		};
	});
</script>

<div class="flex h-screen flex-col bg-slate-100">
	<!-- Header -->
	<Header />

	<!-- Tab Bar -->
	<TabBar 
		{allTabs} 
		{activeTabId} 
		onSwitchTab={switchTab} 
		onCloseTab={closeTab} 
		onReorderTabs={reorderTabs} 
	/>

	<!-- Main Content -->
	<main class="flex-1 overflow-hidden shadow-lg">
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
				{:else if tab.type === 'award_ranking'}
					<AwardRankingTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'award_nomination'}
					<AwardNominationTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'final_award_ranking'}
					<FinalRankingTab {tab} isActive={activeTabId === tab.id} />
				{:else if tab.type === 'award_winner'}
					<AwardWinnerTab {tab} isActive={activeTabId === tab.id} />
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

<style lang="postcss">
	@reference 'tailwindcss';
</style>
