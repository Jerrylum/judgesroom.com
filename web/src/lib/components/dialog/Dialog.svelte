<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		innerContainerClass?: string;
		children?: Snippet;
	}

	let { open, onClose, innerContainerClass = 'max-w-md', children }: Props = $props();

	let dialogElement = $state<HTMLDivElement>();
	let previousActiveElement: Element | null = null;

	// Get all focusable elements within the dialog
	function getFocusableElements(container: HTMLElement): HTMLElement[] {
		const focusableSelectors = [
			'button:not([disabled])',
			'input:not([disabled])',
			'textarea:not([disabled])',
			'select:not([disabled])',
			'a[href]',
			'area[href]',
			'[tabindex]:not([tabindex="-1"])',
			'[contenteditable="true"]'
		].join(', ');

		return Array.from(container.querySelectorAll(focusableSelectors)).filter((element) => {
			// Check if element is visible and not hidden
			const style = window.getComputedStyle(element as HTMLElement);
			return (
				style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				(element as HTMLElement).offsetWidth > 0 &&
				(element as HTMLElement).offsetHeight > 0
			);
		}) as HTMLElement[];
	}

	// Handle focus trapping
	function handleDialogKeydown(event: KeyboardEvent) {
		if (!dialogElement) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
			return;
		}

		if (event.key === 'Tab') {
			const focusableElements = getFocusableElements(dialogElement);

			if (focusableElements.length === 0) {
				event.preventDefault();
				return;
			}

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey) {
				// Shift + Tab: moving backwards
				if (document.activeElement === firstElement) {
					event.preventDefault();
					lastElement.focus();
				}
			} else {
				// Tab: moving forwards
				if (document.activeElement === lastElement) {
					event.preventDefault();
					firstElement.focus();
				}
			}
		}
	}

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

	// Focus management and body overflow control
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (open) {
				// Store the currently focused element
				previousActiveElement = document.activeElement;

				// Apply body overflow hidden
				document.body.style.overflow = 'hidden';

				// Focus first focusable element in dialog
				setTimeout(() => {
					if (dialogElement) {
						const focusableElements = getFocusableElements(dialogElement);
						if (focusableElements.length > 0) {
							focusableElements[0].focus();
						} else {
							// If no focusable elements, focus the dialog itself
							dialogElement.focus();
						}
					}
				}, 0);
			}
		}

		// Cleanup on unmount
		return () => {
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
			}

			// Restore focus to the element that was focused before the dialog opened
			if (previousActiveElement && typeof (previousActiveElement as HTMLElement).focus === 'function') {
				setTimeout(() => {
					(previousActiveElement as HTMLElement).focus();
				}, 0);
			}
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/50 md:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		tabindex="-1"
		onmousedown={handleBackdropClick}
		onkeydown={handleDialogKeydown}
	>
		<div
			bind:this={dialogElement}
			class="max-h-full w-full overflow-auto rounded-lg bg-white p-4 max-md:h-full max-md:max-w-full md:p-6 {innerContainerClass}"
			role="document"
		>
			{@render children?.()}
		</div>
	</div>
{/if}
