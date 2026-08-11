<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { generateQrCodeDataUrl } from '$lib/qrcode';
	import { app, dialogs } from '$lib/index.svelte';
	import ClientsIcon from '$lib/icon/ClientsIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import DenialIcon from '$lib/icon/DenialIcon.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { canUseClipboard } from '$lib/utils.svelte';

	interface Props {
		name: string;
		accessUrl: string;
		judgeId: string;
		onAccessLinksChanged?: () => void;
	}

	let { name, accessUrl, judgeId, onAccessLinksChanged }: Props = $props();

	let currentAccessUrl = $state(accessUrl);
	let qrCodeDataUrl = $state('');
	let copyButtonText = $state(m.copy());
	const clipboardAvailable = canUseClipboard();
	const connectionState = $derived(app.getConnectionState());
	const permit = $derived(app.getPermit());
	const isDisconnectedFromServer = $derived(connectionState !== 'connected');

	const devices = $derived(
		app.getDevices().filter((device) => {
			const auth = device.authenticated;
			return auth?.role === 'judge' && auth.judgeId === judgeId;
		})
	);

	$effect(() => {
		currentAccessUrl = accessUrl;
	});

	$effect(() => {
		if (!currentAccessUrl) return;
		(async () => {
			qrCodeDataUrl = await generateQrCodeDataUrl(currentAccessUrl, {
				width: (41 + 2 + 2) * 4,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				},
				errorCorrectionLevel: 'M'
			});
		})();
	});

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(currentAccessUrl);
			copyButtonText = m.copied();
			setTimeout(() => {
				copyButtonText = m.copy();
			}, 2000);
		} catch (error) {
			console.error('Failed to copy URL:', error);
			copyButtonText = m.failed();
			setTimeout(() => {
				copyButtonText = m.copy();
			}, 2000);
		}
	}

	async function handleRotateLink() {
		const confirmed = await dialogs.showConfirmation({
			title: m.rotate_access_link(),
			message: m.rotate_access_link_confirm(),
			confirmText: m.rotate_access_link(),
			confirmButtonClass: 'danger'
		});
		if (!confirmed) return;

		try {
			const { authToken } = await app.wrpcClient.access.rotateJudgeAuth.mutation({ judgeId });
			currentAccessUrl = app.getJudgesRoomUrl(authToken);
			onAccessLinksChanged?.();
		} catch (error) {
			console.error('Failed to rotate access link:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}

	function getConnectionDuration(connectedAt: number): string {
		const duration = Date.now() - connectedAt;
		const minutes = Math.floor(duration / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		}
		return `${minutes}m`;
	}

	function handleClose() {
		dialogs.closeDialog();
	}

	async function handleKickDevice(targetDeviceId: string) {
		try {
			await app.kickDevice(targetDeviceId);
		} catch (error) {
			console.error('Failed to kick device:', error);
		}
	}

	function handleFocus(event: FocusEvent & { currentTarget: HTMLInputElement }) {
		event.currentTarget.select();
	}
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-4xl p-4!">
	<div class="flex flex-col overflow-auto p-2">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h3 id="dialog-title" class="min-w-0 flex-1 truncate text-lg font-medium text-gray-900">
				{m.judge_access_link({ name })}
			</h3>
			<div class="flex shrink-0 items-center gap-2">
				<button type="button" onclick={() => void handleRotateLink()} class="lightweight tiny">
					{m.rotate_access_link()}
				</button>
				<button
					type="button"
					onclick={handleClose}
					class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
					aria-label="Close dialog"
				>
					<CloseIcon size={24} />
				</button>
			</div>
		</div>

		<div class="flex shrink-0 flex-col gap-6 overflow-hidden md:flex-row">
			<div class="max-h-140 flex-1 space-y-6">
				<div class="text-center">
					<div class="mb-3">
						<h5 class="text-sm font-medium text-gray-700">{m.scan_qr_code()}</h5>
					</div>
					<div class="inline-block rounded-lg bg-gray-50 p-4">
						{#if qrCodeDataUrl}
							<img src={qrCodeDataUrl} alt="" class="h-48 w-48 rounded" draggable="false" />
						{:else}
							<div class="flex h-48 w-48 items-center justify-center text-sm text-gray-500"></div>
						{/if}
					</div>
				</div>

				<div>
					<label for="judge-access-url" class="mb-2 block text-sm font-medium text-gray-700">{m.access_link()}</label>
					<div class="flex items-center space-x-2">
						<input
							id="judge-access-url"
							type="text"
							value={currentAccessUrl}
							readonly
							class="classic min-w-0 flex-1"
							onclick={handleFocus}
							onfocus={handleFocus}
						/>
						{#if clipboardAvailable}
							<button type="button" onclick={handleCopy} class="primary tiny">
								{copyButtonText}
							</button>
						{/if}
					</div>
					{#if !clipboardAvailable}
						<p class="mt-1 text-xs text-gray-500">{m.access_link_select_to_copy()}</p>
					{/if}
				</div>

				<div class="rounded-lg bg-slate-50 p-4">
					<p class="text-xs text-slate-800">{m.judge_access_link_share_instructions()}</p>
				</div>
			</div>

			<div class="flex flex-1 flex-col space-y-4 overflow-hidden lg:max-h-140">
				{#if isDisconnectedFromServer}
					<div class="rounded-lg bg-red-50 p-4">
						<div class="flex items-center space-x-2 text-red-800">
							<DenialIcon />
							<div>
								<h5 class="font-medium">{m.connection_error()}</h5>
								<p class="text-sm">{m.you_are_disconnected_from_the_server()}</p>
							</div>
						</div>
					</div>
				{:else if devices.length === 0}
					<div class="py-8 text-center text-gray-500">
						<ClientsIcon />
						<p class="mt-2 text-sm">{m.no_devices_currently_connected()}</p>
					</div>
				{:else}
					<div class="flex min-h-0 flex-col space-y-3">
						<h5 class="text-sm font-medium text-gray-700">{m.devices()}</h5>
						<div class="min-h-0 space-y-3 overflow-hidden pr-1 lg:overflow-auto">
							{#each devices as device (device.deviceId)}
								<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
									<div class="flex items-center space-x-3">
										{#if device.isOnline}
											<div class="h-2 w-2 rounded-full bg-green-500"></div>
										{:else}
											<div class="h-2 w-2 rounded-full bg-red-500"></div>
										{/if}
										<div>
											<div class="font-medium text-gray-900">
												{device.deviceName}
												{#if permit?.deviceId === device.deviceId}
													<span class="text-xs text-blue-600">({m.you()})</span>
												{/if}
											</div>
											<div class="text-xs text-gray-500">
												{m.joined_ago({ duration: getConnectionDuration(device.connectedAt) })}
											</div>
										</div>
									</div>
									{#if permit?.deviceId !== device.deviceId}
										<button
											type="button"
											onclick={() => handleKickDevice(device.deviceId)}
											class="rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
											title={m.kick_device()}
											aria-label={m.kick_device()}
										>
											<CloseIcon size={16} />
										</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</Dialog>
