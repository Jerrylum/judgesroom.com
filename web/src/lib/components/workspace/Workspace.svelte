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
		tabWidths: number[];
		tabPositions: number[];
	}>({
		isDragging: false,
		draggedTabId: null,
		draggedTabIndex: -1,
		startX: 0,
		currentX: 0,
		offsetX: 0,
		tabElements: [],
		containerElement: null,
		insertIndex: -1,
		tabWidths: [],
		tabPositions: []
	});

	let tabContainer: HTMLDivElement | null = $state(null);
	let tabElements: Record<string, HTMLElement> = $state({});

	function switchTab(tabId: string) {
		tabs.switchToTab(tabId);
	}

	function closeTab(tabId: string) {
		tabs.closeTab(tabId);
	}

	// Helper function to initialize drag state
	function initializeDragState(tab: Tab, index: number, clientX: number, tabElement: HTMLElement) {
		dragState.isDragging = true;
		dragState.draggedTabId = tab.id;
		dragState.draggedTabIndex = index;
		dragState.startX = clientX;
		dragState.currentX = clientX;
		dragState.offsetX = clientX - tabElement.getBoundingClientRect().left;
		dragState.containerElement = tabContainer;
		dragState.insertIndex = index;

		// Calculate initial tab layout
		calculateInitialTabLayout();

		// Add visual feedback
		tabElement.style.cursor = 'grabbing';
		document.body.style.cursor = 'grabbing';
	}

	// Helper function to setup drag event listeners
	function setupDragEventListeners() {
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.addEventListener('touchmove', handleTouchMove, { passive: false });
		document.addEventListener('touchend', handleTouchEnd);

		// Prevent text selection during drag
		document.body.style.userSelect = 'none';
	}

	// Custom drag handlers
	function handleTabMouseDown(e: MouseEvent, tab: Tab, index: number) {
		if (e.button !== 0) return; // Only handle left mouse button

		e.preventDefault();

		const tabElement = tabElements[tab.id];
		if (!tabElement) return;

		initializeDragState(tab, index, e.clientX, tabElement);
		setupDragEventListeners();
		switchTab(tab.id);
	}

	function handleTabTouchStart(e: TouchEvent, tab: Tab, index: number) {
		e.preventDefault();

		const touch = e.touches[0];
		const tabElement = tabElements[tab.id];
		if (!tabElement) return;

		initializeDragState(tab, index, touch.clientX, tabElement);
		setupDragEventListeners();
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

	// Helper function to calculate initial tab positions and widths
	function calculateInitialTabLayout() {
		if (!dragState.containerElement) return;

		const containerRect = dragState.containerElement.getBoundingClientRect();
		dragState.tabWidths = [];
		dragState.tabPositions = [];

		allTabs.forEach((tab, index) => {
			const element = tabElements[tab.id];
			if (element) {
				const rect = element.getBoundingClientRect();
				dragState.tabWidths[index] = rect.width;
				dragState.tabPositions[index] = rect.left - containerRect.left;
			}
		});
	}

	// Helper function to calculate which tabs should move and how much
	function calculateTabMovements(): Array<{ index: number; offsetX: number }> {
		const movements: Array<{ index: number; offsetX: number }> = [];

		if (dragState.insertIndex === dragState.draggedTabIndex) {
			return movements; // No movement needed
		}

		const draggedTabWidth = dragState.tabWidths[dragState.draggedTabIndex] || 0;
		const spaceBetweenTabs = 4; // space-x-1 = 4px

		if (dragState.insertIndex > dragState.draggedTabIndex) {
			// Moving right: tabs between dragged and insert position move left
			for (let i = dragState.draggedTabIndex + 1; i <= dragState.insertIndex; i++) {
				movements.push({
					index: i,
					offsetX: -(draggedTabWidth + spaceBetweenTabs)
				});
			}
		} else {
			// Moving left: tabs between insert and dragged position move right
			for (let i = dragState.insertIndex; i < dragState.draggedTabIndex; i++) {
				movements.push({
					index: i,
					offsetX: draggedTabWidth + spaceBetweenTabs
				});
			}
		}

		return movements;
	}

	// Helper function to find optimal insert position
	function findInsertPosition(relativeX: number): number {
		let insertIndex = 0;

		for (let i = 0; i < allTabs.length; i++) {
			if (i === dragState.draggedTabIndex) continue;

			const tab = allTabs[i];
			const element = tabElements[tab.id];
			if (!element) continue;

			const rect = element.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const containerRect = dragState.containerElement!.getBoundingClientRect();
			const relativeCenterX = centerX - containerRect.left;

			if (relativeX > relativeCenterX) {
				insertIndex = i + 1;
			}
		}

		// Adjust insert index if dragging from left to right
		if (insertIndex > dragState.draggedTabIndex) {
			insertIndex = Math.max(0, insertIndex - 1);
		}

		return Math.max(0, Math.min(insertIndex, allTabs.length - 1));
	}

	// Helper function to apply transforms to all tabs
	function applyTabTransforms() {
		const movements = calculateTabMovements();

		// Reset all tab transforms first
		allTabs.forEach((tab, index) => {
			const element = tabElements[tab.id];
			if (element && index !== dragState.draggedTabIndex) {
				element.style.transform = 'translateX(0px)';
			}
		});

		// Apply movement transforms
		movements.forEach(({ index, offsetX }) => {
			const tab = allTabs[index];
			const element = tabElements[tab.id];
			if (element) {
				element.style.transform = `translateX(${offsetX}px)`;
			}
		});
	}

	// Helper function to apply visual drag transform
	function applyDragTransform(deltaX: number) {
		const draggedElement = dragState.draggedTabId ? tabElements[dragState.draggedTabId] : null;
		if (draggedElement) {
			draggedElement.style.transform = `translateX(${deltaX}px)`;
			draggedElement.style.zIndex = '50';
		}
	}

	function updateDragPosition() {
		const deltaX = dragState.currentX - dragState.startX;
		const draggedElement = dragState.draggedTabId ? tabElements[dragState.draggedTabId] : null;

		if (!draggedElement || !dragState.containerElement) return;

		// Calculate insert position
		const containerRect = dragState.containerElement.getBoundingClientRect();
		const relativeX = dragState.currentX - containerRect.left;
		const newInsertIndex = findInsertPosition(relativeX);

		// Only update if insert position changed
		if (newInsertIndex !== dragState.insertIndex) {
			dragState.insertIndex = newInsertIndex;
		}

		// Apply visual transform to dragged element
		applyDragTransform(deltaX);

		// Apply transforms to other tabs to make space
		applyTabTransforms();
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

	// Helper function to reset visual drag effects
	function resetDragVisuals() {
		// Reset all tab transforms
		allTabs.forEach((tab) => {
			const element = tabElements[tab.id];
			if (element) {
				element.style.transform = 'translateX(0px)';
				element.style.zIndex = '';
				element.style.cursor = '';
			}
		});
	}

	// Helper function to remove drag event listeners
	function removeDragEventListeners() {
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		document.removeEventListener('touchmove', handleTouchMove);
		document.removeEventListener('touchend', handleTouchEnd);
	}

	// Helper function to reset drag state
	function resetDragState() {
		dragState.isDragging = false;
		dragState.draggedTabId = null;
		dragState.draggedTabIndex = -1;
		dragState.insertIndex = -1;
		dragState.startX = 0;
		dragState.currentX = 0;
		dragState.offsetX = 0;
		dragState.tabElements = [];
		dragState.containerElement = null;
		dragState.tabWidths = [];
		dragState.tabPositions = [];
	}

	// Helper function to reorder tabs
	function reorderTabsIfNeeded() {
		if (dragState.insertIndex !== dragState.draggedTabIndex && dragState.insertIndex >= 0) {
			const newTabs = [...allTabs];
			const draggedTab = newTabs.splice(dragState.draggedTabIndex, 1)[0];
			newTabs.splice(dragState.insertIndex, 0, draggedTab);
			tabs.reorderTabs(newTabs);
		}
	}

	// Helper function to restore document state
	function restoreDocumentState() {
		document.body.style.userSelect = '';
		document.body.style.cursor = '';
	}

	function finalizeDrag() {
		if (!dragState.isDragging || dragState.draggedTabId === null) return;

		// Clean up visual effects
		resetDragVisuals();

		// Reorder tabs if position changed
		reorderTabsIfNeeded();

		// Remove event listeners
		removeDragEventListeners();

		// Restore document state
		restoreDocumentState();

		// Reset drag state
		resetDragState();
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
	<div class="overflow-hidden bg-slate-200" style="box-shadow: inset 0px -8px 8px rgba(0, 0, 0, 0.025);">
		<div class="flex px-6">
			<div bind:this={tabContainer} class="flex space-x-1">
				{#each allTabs as tab, index (`${tab.id} ${dragState.isDragging}`)}
					{@const isDragging = dragState.isDragging && dragState.draggedTabId === tab.id}

					<div
						role="button"
						tabindex="0"
						aria-label={`Drag to reorder ${tab.title} tab`}
						class="flex-shrink-0"
						class:transition-transform={!isDragging}
						class:duration-150={!isDragging}
						class:cursor-grab={!isDragging}
						class:cursor-grabbing={dragState.isDragging && dragState.draggedTabId === tab.id}
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
