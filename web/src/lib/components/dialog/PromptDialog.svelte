<script lang="ts">
	import type { PromptDialog } from '$lib/dialog.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	interface Props {
		dialog: PromptDialog;
	}

	let { dialog }: Props = $props();
	let inputValue = $state(dialog.defaultValue || '');
	let inputElement: HTMLInputElement;

	// Focus the input when component mounts
	$effect(() => {
		if (inputElement) {
			setTimeout(() => {
				inputElement.focus();
				inputElement.select();
			}, 0);
		}
	});

	function handleConfirm() {
		dialogs.closeDialog(inputValue);
	}

	function handleCancel() {
		dialogs.closeDialog(null);
	}

	// Handle Enter key for confirmation in the input field
	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleConfirm();
		}
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-md">
	<!-- Title -->
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">{dialog.title}</h3>

	<!-- Message -->
	{#if dialog.message}
		<p id="dialog-message" class="mb-4 text-sm text-gray-600">{dialog.message}</p>
	{/if}

	<!-- Input -->
	<div class="mb-6">
		<input
			bind:this={inputElement}
			bind:value={inputValue}
			type={dialog.inputType || 'text'}
			placeholder={dialog.placeholder || ''}
			class="classic block w-full"
			aria-describedby={dialog.message ? 'dialog-message' : undefined}
			onkeydown={handleInputKeydown}
		/>
	</div>

	<!-- Buttons -->
	<div class="flex justify-end space-x-3">
		<button onclick={handleCancel} class="secondary">
			{dialog.cancelText || 'Cancel'}
		</button>
		<button onclick={handleConfirm} class="primary">
			{dialog.confirmText || 'OK'}
		</button>
	</div>
</Dialog>
