<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { dialogs } from '$lib/index.svelte';
	import { canUseClipboard } from '$lib/utils.svelte';

	interface Props {
		accessLink: string;
		onVerified?: () => void;
	}

	let { accessLink, onVerified }: Props = $props();

	let pastedLink = $state('');
	let errorMessage = $state('');
	let copyButtonText = $state(m.copy());
	const clipboardAvailable = canUseClipboard();

	function normalize(url: string): string {
		return url.trim();
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(accessLink);
			copyButtonText = m.copied();
			setTimeout(() => {
				copyButtonText = m.copy();
			}, 2000);
		} catch {
			copyButtonText = m.failed();
			setTimeout(() => {
				copyButtonText = m.copy();
			}, 2000);
		}
	}

	function handleConfirm() {
		if (normalize(pastedLink) !== normalize(accessLink)) {
			errorMessage = m.access_link_verification_failed();
			return;
		}
		onVerified?.();
		dialogs.closeDialog();
	}
</script>

<Dialog open={true} onClose={() => {}} innerContainerClass="max-w-xl p-4!">
	<div class="space-y-4 p-2">
		<h3 class="text-lg font-medium text-gray-900">{m.save_your_access_link()}</h3>
		<p class="text-sm text-gray-700">{m.save_your_access_link_warning()}</p>

		<div>
			<label for="ja-access-link" class="mb-2 block text-sm font-medium text-gray-700">{m.your_judge_advisor_access_link()}</label>
			<div class="flex items-center gap-2">
				<input id="ja-access-link" type="text" value={accessLink} readonly class="classic flex-1" />
				{#if clipboardAvailable}
					<button onclick={copyLink} class="primary tiny">{copyButtonText}</button>
				{/if}
			</div>
		</div>

		<div>
			<label for="ja-access-link-confirm" class="mb-2 block text-sm font-medium text-gray-700"
				>{m.paste_your_access_link_to_confirm()}</label
			>
			<input id="ja-access-link-confirm" type="text" bind:value={pastedLink} class="classic w-full" />
			{#if errorMessage}
				<p class="mt-1 text-sm text-red-600">{errorMessage}</p>
			{/if}
		</div>

		<div class="flex justify-end">
			<button onclick={handleConfirm} class="primary">{m.i_saved_my_access_link()}</button>
		</div>
	</div>
</Dialog>
