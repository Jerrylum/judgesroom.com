<script lang="ts">
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import type { Tab } from '$lib/tab.svelte';

	interface Props {
		tab: Tab;
		isActive: boolean;
		onClose: () => void;
		isDragging?: boolean;
	}

	let { tab, isActive, onClose, isDragging = false }: Props = $props();
</script>

<div
	class="group relative flex h-8 select-none items-start justify-start px-2.5 text-xs transition-colors"
	class:cursor-grab={!isDragging}
	class:cursor-grabbing={isDragging}
>
	<div class="z-30 flex h-7 flex-row items-center">
		<span class="min-w-30 overflow-hidden truncate text-ellipsis whitespace-nowrap text-left text-slate-900">{tab.title}</span>
		{#if tab.closable}
			<div class="relative">
				<button
					onmousedown={(e) => {
						e.stopPropagation();
					}}
					ontouchstart={(e) => {
						e.stopPropagation();
					}}
					onclick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					class="relative left-1 flex-shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-slate-400"
					tabindex="0"
					aria-label="Close tab"
				>
					<CloseIcon size={12} />
				</button>
			</div>
		{/if}
	</div>
	{#if isActive}
		<div class="absolute -left-4 -right-4 top-0 h-8" class:z-10={isActive}>
			<div
				class="absolute left-4 right-4 top-0 h-8 rounded-tl-lg rounded-tr-lg border-l border-r border-t border-transparent bg-slate-100"
			></div>
			<svg
				class="absolute bottom-0 left-0 h-4 w-4 fill-slate-100"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				viewBox="0 0 100 100"
			>
				<defs>
					<mask id="Mask">
						<rect x="0" y="0" width="100" height="100" fill="white" />
						<circle cx="50" cy="50" r="50" fill="black" />
					</mask>
				</defs>
				<rect x="50" y="50" width="50" height="50" mask="url(#Mask)" />
			</svg>
			<svg
				class="absolute bottom-0 right-0 h-4 w-4 fill-slate-100"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				viewBox="0 0 100 100"
			>
				<defs>
					<mask id="Mask">
						<rect x="0" y="0" width="100" height="100" fill="white" />
						<circle cx="50" cy="50" r="50" fill="black" />
					</mask>
				</defs>
				<rect x="0" y="50" width="50" height="50" mask="url(#Mask)" />
			</svg>
		</div>
	{:else}
		<div class="absolute -left-2 -right-2 top-0 z-20 h-8">
			<div class="absolute left-2 right-2 top-0 h-7 rounded-md group-hover:bg-slate-300"></div>
		</div>
	{/if}
</div>
