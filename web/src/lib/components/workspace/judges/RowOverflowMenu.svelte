<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import EllipsisVerticalIcon from '$lib/icon/EllipsisVerticalIcon.svelte';
	import { onDestroy, type Snippet } from 'svelte';

	interface Props {
		children: Snippet<[{ close: () => void }]>;
		align?: 'left' | 'right';
	}

	let { children, align = 'right' }: Props = $props();

	let open = $state(false);
	let rootEl: HTMLDivElement | null = $state(null);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function onDocumentPointerDown(event: PointerEvent) {
		if (!open || !rootEl) return;
		if (!rootEl.contains(event.target as Node)) {
			close();
		}
	}

	$effect(() => {
		if (!open) return;
		document.addEventListener('pointerdown', onDocumentPointerDown);
		return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
	});

	onDestroy(() => {
		document.removeEventListener('pointerdown', onDocumentPointerDown);
	});
</script>

<div class="relative" bind:this={rootEl}>
	<button
		type="button"
		onclick={toggle}
		class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
		aria-label={m.more_options()}
		aria-haspopup="menu"
		aria-expanded={open}
	>
		<EllipsisVerticalIcon size={14} />
	</button>
	{#if open}
		<div
			role="menu"
			class="absolute z-20 mt-1 min-w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg [&_[role=menuitem]]:w-full [&_[role=menuitem]]:px-3 [&_[role=menuitem]]:py-2 [&_[role=menuitem]]:text-left [&_[role=menuitem]]:text-sm [&_[role=menuitem]]:hover:bg-gray-50"
			class:left-0={align === 'left'}
			class:right-0={align === 'right'}
		>
			{@render children({ close })}
		</div>
	{/if}
</div>
