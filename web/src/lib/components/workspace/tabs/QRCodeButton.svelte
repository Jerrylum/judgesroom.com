<script lang="ts">
	import { dialogs } from '$lib/app-page.svelte';
	import QRCodeDialog from './QRCodeDialog.svelte';
	import QRCodeIcon from '$lib/icon/QRCodeIcon.svelte';

	interface Props {
		link: string;
	}

	let { link }: Props = $props();

	function openQRCodeDialog(link: string) {
		dialogs.showCustom(QRCodeDialog, { props: { link } });
	}
</script>

<div class="h-6 w-6">
	<button onclick={() => openQRCodeDialog(link)} class="block h-6 w-6" title="Open a dialog with a QR code for the link">
		<QRCodeIcon />
	</button>
</div>
