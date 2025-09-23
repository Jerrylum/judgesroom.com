export function scrollSync() {
	// Scroll container references for synchronization
	const scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

	// Synchronize scroll positions across all containers
	function syncScrollPosition(sourceContainer: HTMLElement) {
		if (isSyncing) return; // Prevent infinite loop

		isSyncing = true;
		const scrollLeft = sourceContainer.scrollLeft;

		scrollContainers.forEach((container) => {
			if (container !== sourceContainer) {
				container.scrollLeft = scrollLeft;
			}
		});

		// Use setTimeout to reset the flag after all scroll events have been processed
		setTimeout(() => {
			isSyncing = false;
		}, 0);
	}

	// Register scroll container and add event listener
	function registerScrollContainer(container: HTMLElement) {
		if (!scrollContainers.includes(container)) {
			scrollContainers.push(container);
			container.addEventListener('scroll', () => syncScrollPosition(container));
		}
	}

	function scrollLeft() {
		const source = scrollContainers[0];
		if (!source) return;

		const scrollLeft = source.scrollLeft - source.getBoundingClientRect().width;
		source.scrollTo({ left: scrollLeft, behavior: 'smooth' });
	}

	function scrollRight() {
		const source = scrollContainers[0];
		if (!source) return;

		const scrollLeft = source.scrollLeft + source.getBoundingClientRect().width;
		source.scrollTo({ left: scrollLeft, behavior: 'smooth' });
	}

	return {
		registerScrollContainer,
		scrollLeft,
		scrollRight
	};
}
