<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { dialogs } from '$lib/index.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	interface Props {
		title: string;
		message: string;
		awardNames: string[];
		detail: string;
		confirmText: string;
	}

	let { title, message, awardNames, detail, confirmText }: Props = $props();

	function handleConfirm() {
		dialogs.closeDialog(true);
	}

	function handleCancel() {
		dialogs.closeDialog(false);
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-lg">
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
	<p id="dialog-message" class="mb-4 text-sm text-gray-600">{message}</p>
	<ul class="mb-4 max-h-48 list-disc space-y-1 overflow-y-auto rounded-lg border border-gray-300 p-4 pl-8 text-sm text-gray-900">
		{#each awardNames as name (name)}
			<li>{name}</li>
		{/each}
	</ul>
	<p class="mb-6 text-sm text-gray-600">{detail}</p>
	<div class="flex justify-end space-x-3">
		<button type="button" onclick={handleCancel} class="secondary">{m.cancel()}</button>
		<button type="button" onclick={handleConfirm} class="danger">{confirmText}</button>
	</div>
</Dialog>
