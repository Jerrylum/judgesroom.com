<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		innerContainerClass?: string;
		children?: Snippet;
	}

	let {
		open,
		onClose,
		innerContainerClass: innerContainerClass = 'max-w-md',
		children
	}: Props = $props();

	// Handle keyboard events
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			onClose();
		}
	}

	// Close on backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	// Apply overflow hidden to body when dialog is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (open) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}

		// Cleanup on unmount
		return () => {
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
			}
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onmousedown={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div class="max-h-full w-full overflow-auto rounded-lg bg-white p-6 {innerContainerClass}">
			{@render children?.()}
		</div>
	</div>
{/if}
