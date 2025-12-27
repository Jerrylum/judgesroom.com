<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { dialogs } from '$lib/index.svelte';
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
	<button onclick={() => openQRCodeDialog(link)} class="block h-6 w-6" title={m.open_qr_code_dialog()}>
		<QRCodeIcon />
	</button>
</div>
