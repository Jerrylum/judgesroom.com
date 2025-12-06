<script lang="ts">
	import { dialogs } from '$lib/index.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';

	interface Props {
		reportText: string;
	}

	let { reportText }: Props = $props();
	let copyButtonText = $state('Copy');
	let textareaElement: HTMLTextAreaElement;

	async function copyText() {
		try {
			await navigator.clipboard.writeText(reportText);
			copyButtonText = 'Copied!';
			setTimeout(() => {
				copyButtonText = 'Copy';
			}, 2000);
		} catch (error) {
			console.error('Failed to copy text:', error);
			copyButtonText = 'Failed';
			setTimeout(() => {
				copyButtonText = 'Copy';
			}, 2000);
		}
	}

	function handleClose() {
		dialogs.closeDialog();
	}

	// Focus and select text when component mounts
	$effect(() => {
		if (textareaElement) {
			setTimeout(() => {
				textareaElement.focus();
				textareaElement.select();
			}, 0);
		}
	});
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-3xl">
	<div class="flex flex-col">
		<div class="mb-4 flex items-center justify-between">
			<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">Award Winners Report</h3>
			<button onclick={handleClose} class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close dialog">
				<CloseIcon size={24} />
			</button>
		</div>

		<p class="mb-4 text-sm text-gray-600">Copy this report to share the award winners.</p>

		<div class="mb-4">
			<textarea
				bind:this={textareaElement}
				readonly
				value={reportText}
				class="classic block h-96 w-full font-mono text-sm"
				aria-label="Award winners report"
			></textarea>
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={handleClose} class="secondary">Close</button>
			<button onclick={copyText} class="primary">
				{copyButtonText}
			</button>
		</div>
	</div>
</Dialog>
