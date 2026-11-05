export function scrollSync() {
	const scrollContainers: HTMLElement[] = [];
	let isSyncing = false;

	function connectedContainers() {
		for (let index = scrollContainers.length - 1; index >= 0; index--) {
			if (!scrollContainers[index].isConnected) {
				scrollContainers.splice(index, 1);
			}
		}
		return scrollContainers;
	}

	function syncScrollPosition(sourceContainer: HTMLElement) {
		if (isSyncing) return;

		isSyncing = true;
		const scrollLeft = sourceContainer.scrollLeft;

		for (const container of connectedContainers()) {
			if (container !== sourceContainer) {
				container.scrollLeft = scrollLeft;
			}
		}

		isSyncing = false;
	}

	function registerScrollContainer(container: HTMLElement) {
		if (scrollContainers.includes(container)) return;

		scrollContainers.push(container);
		const onScroll = () => syncScrollPosition(container);
		container.addEventListener('scroll', onScroll);

		return {
			destroy() {
				container.removeEventListener('scroll', onScroll);
				const index = scrollContainers.indexOf(container);
				if (index !== -1) scrollContainers.splice(index, 1);
			}
		};
	}

	function scrollByPage(direction: -1 | 1) {
		const containers = connectedContainers();
		const source = containers.find((container) => container.scrollWidth - container.clientWidth > 1);
		if (!source) return;

		const max = source.scrollWidth - source.clientWidth;
		const next = Math.min(max, Math.max(0, source.scrollLeft + direction * source.clientWidth));

		// Assign directly. A smooth scrollTo on one row is undone when the sync
		// listener writes scrollLeft on the others, so the button appears to do nothing.
		isSyncing = true;
		for (const container of containers) {
			container.scrollLeft = next;
		}
		isSyncing = false;
	}

	function scrollLeft() {
		scrollByPage(-1);
	}

	function scrollRight() {
		scrollByPage(1);
	}

	return {
		registerScrollContainer,
		scrollLeft,
		scrollRight
	};
}
