<script lang="ts">
	import TabButton from './tabs/TabButton.svelte';
	import type { Tab } from '$lib/tab.svelte';

	// Props
	interface Props {
		allTabs: Tab[];
		activeTabId: string | null;
		onSwitchTab: (tabId: string) => void;
		onCloseTab: (tabId: string) => void;
		onReorderTabs: (newOrder: Tab[]) => void;
	}

	let { allTabs, activeTabId, onSwitchTab, onCloseTab, onReorderTabs }: Props = $props();

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

	// Helper function to get pinned tabs and non-pinned tabs separately
	const pinnedTabs = $derived(allTabs.filter((tab) => tab.isPinned));
	const nonPinnedTabs = $derived(allTabs.filter((tab) => !tab.isPinned));

	// Helper function to get the index of a tab in the non-pinned tabs array
	function getNonPinnedTabIndex(tab: Tab): number {
		return nonPinnedTabs.findIndex((t) => t.id === tab.id);
	}

	// Custom drag handlers
	function handleTabMouseDown(e: MouseEvent, tab: Tab, index: number) {
		if (e.button !== 0) return; // Only handle left mouse button
		e.preventDefault();
		onSwitchTab(tab.id);

		if (tab.isPinned) return; // Don't allow dragging pinned tabs

		const tabElement = tabElements[tab.id];
		if (!tabElement) return;

		const nonPinnedIndex = getNonPinnedTabIndex(tab);
		if (nonPinnedIndex === -1) return;

		initializeDragState(tab, nonPinnedIndex, e.clientX, tabElement);
		setupDragEventListeners();
	}

	function handleTabTouchStart(e: TouchEvent, tab: Tab, index: number) {
		if (tab.isPinned) return; // Don't allow dragging pinned tabs

		e.preventDefault();

		const touch = e.touches[0];
		const tabElement = tabElements[tab.id];
		if (!tabElement) return;

		const nonPinnedIndex = getNonPinnedTabIndex(tab);
		if (nonPinnedIndex === -1) return;

		initializeDragState(tab, nonPinnedIndex, touch.clientX, tabElement);
		setupDragEventListeners();
		onSwitchTab(tab.id);
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

		nonPinnedTabs.forEach((tab, index) => {
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

		for (let i = 0; i < nonPinnedTabs.length; i++) {
			if (i === dragState.draggedTabIndex) continue;

			const tab = nonPinnedTabs[i];
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

		return Math.max(0, Math.min(insertIndex, nonPinnedTabs.length - 1));
	}

	// Helper function to apply transforms to all tabs
	function applyTabTransforms() {
		const movements = calculateTabMovements();

		// Reset all non-pinned tab transforms first (don't touch pinned tabs)
		nonPinnedTabs.forEach((tab, index) => {
			const element = tabElements[tab.id];
			if (element && index !== dragState.draggedTabIndex) {
				element.style.transform = 'translateX(0px)';
			}
		});

		// Apply movement transforms
		movements.forEach(({ index, offsetX }) => {
			const tab = nonPinnedTabs[index];
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

		document.body.style.userSelect = '';
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
			// Create new arrays with pinned tabs at front
			const newNonPinnedTabs = [...nonPinnedTabs];
			const draggedTab = newNonPinnedTabs.splice(dragState.draggedTabIndex, 1)[0];
			newNonPinnedTabs.splice(dragState.insertIndex, 0, draggedTab);

			// Combine pinned and non-pinned tabs with pinned tabs at front
			const newTabs = [...pinnedTabs, ...newNonPinnedTabs];
			onReorderTabs(newTabs);
		}
	}

	function finalizeDrag() {
		if (!dragState.isDragging || dragState.draggedTabId === null) return;

		// Clean up visual effects
		resetDragVisuals();

		// Reorder tabs if position changed
		reorderTabsIfNeeded();

		// Remove event listeners
		removeDragEventListeners();

		// Reset drag state
		resetDragState();
	}
</script>

<!-- Tab Bar -->
<div class="overflow-hidden bg-slate-200" style="box-shadow: inset 0px -8px 8px rgba(0, 0, 0, 0.025);">
	<div class="flex px-2 md:px-6">
		<div bind:this={tabContainer} class="flex space-x-1 flex-1">
			{#each allTabs as tab, index (`${tab.id} ${dragState.isDragging}`)}
				{@const isDragging = dragState.isDragging && dragState.draggedTabId === tab.id}

				<div
					role="button"
					tabindex="0"
					aria-label={tab.isPinned ? `${tab.title} tab (pinned)` : `Drag to reorder ${tab.title} tab`}
					class="flex"
					class:basis-36={!tab.isPinned}
					class:transition-transform={!isDragging}
					class:duration-150={!isDragging}
					class:cursor-pointer={tab.isPinned && !isDragging}
					class:cursor-grab={!tab.isPinned && !isDragging}
					class:cursor-grabbing={!tab.isPinned && isDragging}
					bind:this={tabElements[tab.id]}
					onmousedown={(e) => handleTabMouseDown(e, tab, index)}
					ontouchstart={(e) => handleTabTouchStart(e, tab, index)}
					onkeydown={(e) => {
						// Handle keyboard interaction for accessibility
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onSwitchTab(tab.id);
						}
					}}
				>
					<TabButton
						{tab}
						isActive={activeTabId === tab.id}
						onClose={() => onCloseTab(tab.id)}
						isDragging={dragState.isDragging && dragState.draggedTabId === tab.id}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>
