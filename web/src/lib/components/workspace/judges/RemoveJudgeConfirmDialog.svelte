<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { dialogs } from '$lib/index.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	interface Props {
		judgeName: string;
		notebookCount: number;
		interviewCount: number;
	}

	let { judgeName, notebookCount, interviewCount }: Props = $props();

	let typedName = $state('');
	const canConfirm = $derived(typedName.trim() === judgeName);

	function handleConfirm() {
		if (!canConfirm) return;
		dialogs.closeDialog(true);
	}

	function handleCancel() {
		dialogs.closeDialog(false);
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-md p-4!">
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">{m.remove_judge_confirm_title()}</h3>
	<p id="dialog-message" class="mb-4 text-sm text-red-700">
		{m.remove_judge_confirm_with_rubrics({
			notebookCount: String(notebookCount),
			interviewCount: String(interviewCount)
		})}
	</p>
	<label class="mb-2 block text-sm font-medium text-gray-700" for="confirm-judge-name">
		{m.remove_judge_type_name_to_confirm({ name: judgeName })}
	</label>
	<input
		id="confirm-judge-name"
		type="text"
		bind:value={typedName}
		class="classic mb-6 block w-full"
		autocomplete="off"
		onkeydown={(event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				handleConfirm();
			}
		}}
	/>
	<div class="flex justify-end space-x-3">
		<button type="button" onclick={handleCancel} class="secondary">{m.cancel()}</button>
		<button type="button" onclick={handleConfirm} class="danger" disabled={!canConfirm}>{m.remove_judge()}</button>
	</div>
</Dialog>
