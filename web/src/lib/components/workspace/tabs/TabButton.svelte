<script lang="ts">
	import type { Tab } from '$lib/tab.svelte';

	interface Props {
		tab: Tab;
		isActive: boolean;
		onSwitch: () => void;
		onClose: () => void;
	}

	let { tab, isActive, onSwitch, onClose }: Props = $props();
</script>

<button
	onclick={onSwitch}
	class="flex items-center space-x-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
	class:border-slate-500={isActive}
	class:text-slate-600={isActive}
	class:border-transparent={!isActive}
	class:text-gray-500={!isActive}
	class:hover:text-gray-700={!isActive}
>
	<span>{tab.title}</span>
	{#if tab.closable}
		<div
			onclick={(e) => {
				e.stopPropagation();
				onClose();
			}}
			class="ml-2 cursor-pointer rounded-full p-1 hover:bg-gray-200"
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
	{/if}
</button>
