<script lang="ts">
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import QRCode from 'qrcode';
	import { dialogs } from '$lib/app-page.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';

	interface Props {
		link: string;
	}

	let { link }: Props = $props();

	let qrCodeDataUrl = $state('');

	$effect(() => {
		if (link) {
			(async () => {
				qrCodeDataUrl = await QRCode.toDataURL(link, { width: 20, margin: 0 });
			})();
		}
	});

	function handleClose() {
		dialogs.closeDialog();
	}
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-64 p-4!">
	<div class="flex flex-col overflow-auto p-2">
		<div class="mb-4 flex items-center justify-between">
			<h3 id="dialog-title" class="text-lg font-medium text-gray-900">QR Code</h3>
			<button onclick={handleClose} class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close dialog">
				<CloseIcon size={24} />
			</button>
		</div>

		<div class="mb-2 flex justify-center">
			<img src={qrCodeDataUrl} alt="QR Code for Judges' Room link" class="w-full" />
		</div>
		<div>
			<a
				href={link}
				target="_blank"
				class="block overflow-hidden text-xs text-blue-600 underline hover:text-blue-800 active:text-blue-900"
				title={link}
			>
				{link}
			</a>
		</div>
	</div>
</Dialog>
