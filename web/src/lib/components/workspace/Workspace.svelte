<script lang="ts">
	import { app, subscriptions, tabs } from '$lib/app-page.svelte';
	import Header from './Header.svelte';
	import TabButton from './tabs/TabButton.svelte';
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

	// Custom drag state
	let dragState = $state<{
		isDragging: boolean;
		draggedTabId: string | null;
		draggedTabIndex: number;
		startX: number;
		currentX: number;
		offsetX: number;
		tabElements: HTMLElement[];
		containerElement: HTMLElement | null;
		insertIndex: number;
	}>({
		isDragging: false,
		draggedTabId: null,
		draggedTabIndex: -1,
		startX: 0,
		currentX: 0,
		offsetX: 0,
		tabElements: [],
		containerElement: null,
		insertIndex: -1
	});

	let tabContainer: HTMLDivElement | null = $state(null);
	let tabElements: Record<string, HTMLElement> = $state({});

	function switchTab(tabId: string) {
		tabs.switchToTab(tabId);
	}

	function closeTab(tabId: string) {
		tabs.closeTab(tabId);
	}

	// Custom drag handlers
	function handleTabMouseDown(e: MouseEvent, tab: Tab, index: number) {
		if (e.button !== 0) return; // Only handle left mouse button

		e.preventDefault();

		const tabElement = tabElements[tab.id];
		if (!tabElement) return;

		dragState.isDragging = true;
		dragState.draggedTabId = tab.id;
		dragState.draggedTabIndex = index;
		dragState.startX = e.clientX;
		dragState.currentX = e.clientX;
		dragState.offsetX = e.clientX - tabElement.getBoundingClientRect().left;
		dragState.containerElement = tabContainer;
		dragState.insertIndex = index;

		// Add event listeners to document for mouse move and up
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		// Prevent text selection during drag
		document.body.style.userSelect = 'none';

		switchTab(tab.id);
	}

	function handleTabTouchStart(e: TouchEvent, tab: Tab, index: number) {
		e.preventDefault();

		const touch = e.touches[0];
		const tabElement = tabElements[tab.id];
		if (!tabElement) return;

		dragState.isDragging = true;
		dragState.draggedTabId = tab.id;
		dragState.draggedTabIndex = index;
		dragState.startX = touch.clientX;
		dragState.currentX = touch.clientX;
		dragState.offsetX = touch.clientX - tabElement.getBoundingClientRect().left;
		dragState.containerElement = tabContainer;
		dragState.insertIndex = index;

		// Add event listeners to document for touch move and end
		document.addEventListener('touchmove', handleTouchMove, { passive: false });
		document.addEventListener('touchend', handleTouchEnd);

		switchTab(tab.id);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragState.isDragging || !dragState.containerElement) return;

		e.preventDefault();
		dragState.currentX = e.clientX;
		updateDragPosition();
	}

	function handleTouchMove(e: TouchEvent) {
		if (!dragState.isDragging || !dragState.containerElement) return;

		e.preventDefault();
		const touch = e.touches[0];
		dragState.currentX = touch.clientX;
		updateDragPosition();
	}

	function updateDragPosition() {
		const deltaX = dragState.currentX - dragState.startX;
		const draggedElement = dragState.draggedTabId ? tabElements[dragState.draggedTabId] : null;

		if (!draggedElement || !dragState.containerElement) return;

		// Apply visual transform to dragged element
		draggedElement.style.transform = `translateX(${deltaX}px)`;

		// Calculate insert position
		const containerRect = dragState.containerElement.getBoundingClientRect();
		const relativeX = dragState.currentX - containerRect.left;

		let insertIndex = 0;
		const tabRects = allTabs
			.map((tab, index) => {
				const element = tabElements[tab.id];
				if (!element || tab.id === dragState.draggedTabId) return null;
				const rect = element.getBoundingClientRect();
				return { index, centerX: rect.left + rect.width / 2 - containerRect.left };
			})
			.filter(Boolean);

		for (const tabRect of tabRects) {
			if (relativeX > tabRect!.centerX) {
				insertIndex = tabRect!.index + 1;
			}
		}

		// Adjust insert index if dragging from left to right
		if (insertIndex > dragState.draggedTabIndex) {
			insertIndex = Math.max(0, insertIndex - 1);
		}

		dragState.insertIndex = Math.max(0, Math.min(insertIndex, allTabs.length - 1));
	}

	function handleMouseUp(e: MouseEvent) {
		if (!dragState.isDragging) return;

		e.preventDefault();
		finalizeDrag();
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!dragState.isDragging) return;

		e.preventDefault();
		finalizeDrag();
	}

	function finalizeDrag() {
		if (!dragState.isDragging || dragState.draggedTabId === null) return;

		// Clean up visual effects
		const draggedElement = tabElements[dragState.draggedTabId];
		if (draggedElement) {
			draggedElement.style.transform = 'translateX(0px)';
		}

		// Reorder tabs if position changed
		if (dragState.insertIndex !== dragState.draggedTabIndex) {
			const newTabs = [...allTabs];
			const draggedTab = newTabs.splice(dragState.draggedTabIndex, 1)[0];
			newTabs.splice(dragState.insertIndex, 0, draggedTab);
			tabs.reorderTabs(newTabs);
		}

		// Reset drag state
		dragState.isDragging = false;
		dragState.draggedTabId = null;
		dragState.draggedTabIndex = -1;
		dragState.insertIndex = -1;

		// Remove event listeners
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		document.removeEventListener('touchmove', handleTouchMove);
		document.removeEventListener('touchend', handleTouchEnd);

		// Restore text selection
		document.body.style.userSelect = '';
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
	<div class=" bg-slate-200">
		<div class="flex px-6">
			<div bind:this={tabContainer} class="flex space-x-1">
				{#each allTabs as tab, index (tab.id)}
					{@const isDragging = dragState.isDragging && dragState.draggedTabId === tab.id}
					<div
						role="button"
						tabindex="0"
						aria-label={`Drag to reorder ${tab.title} tab`}
						class="flex-shrink-0"
						class:z-40={isDragging}
						class:transition-transform={!isDragging}
						class:duration-150={!isDragging}
						bind:this={tabElements[tab.id]}
						onmousedown={(e) => handleTabMouseDown(e, tab, index)}
						ontouchstart={(e) => handleTabTouchStart(e, tab, index)}
						onkeydown={(e) => {
							// Handle keyboard interaction for accessibility
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								switchTab(tab.id);
							}
						}}
					>
						<TabButton
							{tab}
							isActive={activeTabId === tab.id}
							onClose={() => closeTab(tab.id)}
							isDragging={dragState.isDragging && dragState.draggedTabId === tab.id}
						/>
					</div>
				{/each}
			</div>
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
