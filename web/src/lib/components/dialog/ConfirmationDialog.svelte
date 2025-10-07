<script lang="ts">
	import type { ConfirmationDialog } from '$lib/dialog.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	interface Props {
		dialog: ConfirmationDialog;
	}

	let { dialog }: Props = $props();

	function handleConfirm() {
		dialogs.closeDialog(true);
	}

	function handleCancel() {
		dialogs.closeDialog(false);
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-md">
	<!-- Title -->
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">{dialog.title}</h3>

	<!-- Message -->
	<p id="dialog-message" class="mb-6 text-sm text-gray-600">{dialog.message}</p>

	<!-- Buttons -->
	<div class="flex justify-end space-x-3">
		<button onclick={handleCancel} class={dialog.cancelButtonClass || 'cancel'}>
			{dialog.cancelText || 'Cancel'}
		</button>
		<button 
			onclick={handleConfirm} 
			class={dialog.confirmButtonClass || 'primary'}
			onkeydown={(e) => e.key === 'Enter' && handleConfirm()}
		>
			{dialog.confirmText || 'Confirm'}
		</button>
	</div>
</Dialog>
