<script lang="ts">
	import type { Tab } from '$lib/tab.svelte';

	interface Props {
		tab: Tab;
		isActive: boolean;
		onSwitch: () => void;
		onClose: () => void;
	}

	let { tab, isActive, onSwitch, onClose }: Props = $props();

	// class:border-slate-500={isActive}
	// class:text-slate-600={isActive}
	// class:border-transparent={!isActive}
	// class:text-gray-500={!isActive}
	// class:hover:text-gray-700={!isActive}
</script>

<button
	onclick={onSwitch}
	class="tab-button group relative flex h-8 cursor-move select-none items-start justify-start px-2.5 text-xs transition-colors"
	class:bg-gray-50={isActive}
>
	<div class="z-30 flex h-7 flex-row items-center">
		<span class="min-w-30 overflow-hidden truncate text-ellipsis whitespace-nowrap text-left">{tab.title}</span>
		{#if tab.closable}
			<div class="relative">
				<div
					onclick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					class="relative left-1 flex-shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-gray-200"
					role="button"
					tabindex="0"
					aria-label="Close tab"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							e.stopPropagation();
							onClose();
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
			</div>
		{/if}
	</div>
	<!-- <div class:z-10={isActive}>
		<div class="absolute right-[calc(100%+7px)] top-6 h-2 w-screen border-b border-slate-500"></div>
		<div class="absolute left-full top-6 h-2 w-screen border-b border-slate-500 bg-red-50"></div>
		<div class="absolute left-0 right-0 top-0 h-6 rounded-tl-md rounded-tr-md border-l border-r border-t border-slate-500"></div>
		<div class="absolute -left-[7px] -right-[7px] top-6 h-2 "></div>
		<div class="border-br absolute -bottom-0 -left-[7px] h-2 w-2 rounded-br-md border-b border-r border-slate-500 "></div>
		<div class="border-bl absolute -bottom-0 -right-[7px] h-2 w-2 rounded-bl-md border-b border-l border-slate-500 "></div>
	</div> -->
	{#if isActive}
		<div class="absolute -left-2 -right-2 top-0 h-8" class:z-10={isActive}>
			<div class="absolute right-0 top-6 h-2 w-screen border-b border-slate-300"></div>
			<div class="absolute left-0 top-6 h-2 w-screen border-b border-slate-300"></div>
			<div class="absolute left-[1px] right-[1px] top-6 h-2 bg-gray-50" class:bg-gray-50={isActive}></div>
			<div class="absolute left-2 right-2 top-0 h-6 rounded-tl-md rounded-tr-md border-l border-r border-t border-slate-300"></div>
			<div class="border-br absolute bottom-0 left-[1px] h-2 w-2 rounded-br-md border-b border-r border-slate-300 bg-white"></div>
			<div class="border-bl absolute bottom-0 right-[1px] h-2 w-2 rounded-bl-md border-b border-l border-slate-300 bg-white"></div>
		</div>
	{:else}
		<div class="absolute -left-2 -right-2 top-0 z-20 h-8">
			<div class="absolute left-2 right-2 top-0 h-7 rounded-md group-hover:bg-slate-50"></div>
		</div>
	{/if}
</button>
