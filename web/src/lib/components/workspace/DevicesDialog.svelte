<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { generateQrCodeDataUrl } from '$lib/qrcode';
	import { app, dialogs } from '$lib/index.svelte';
	import ClientsIcon from '$lib/icon/ClientsIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import DenialIcon from '$lib/icon/DenialIcon.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import AccessLinkVerifyDialog from '$lib/components/access/AccessLinkVerifyDialog.svelte';
	import { canUseClipboard } from '$lib/utils.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { DeviceAuthenticated } from '@judgesroom.com/protocol/src/access';
	import type { DeviceInfo } from '@judgesroom.com/protocol/src/client';

	let qrCodeDataUrl = $state('');
	let secretsVisible = $state(false);
	let copyButtonText = $state(m.copy());
	const clipboardAvailable = canUseClipboard();
	const showAccessLinkAction = $derived(!secretsVisible || clipboardAvailable);
	const accessLinkActionLabel = $derived(secretsVisible ? copyButtonText : m.show());

	const devices = $derived(app.getDevices());
	const connectionState = $derived(app.getConnectionState());
	const permit = $derived(app.getPermit());
	const isJudgeAdvisor = $derived(app.getCurrentUser()?.role === 'judge_advisor');
	const personalAccessUrl = $derived(app.getJudgesRoomUrl());
	const currentDevice = $derived(permit ? devices.find((device) => device.deviceId === permit.deviceId) : null);
	const isDisconnectedFromServer = $derived(connectionState !== 'connected');

	function sameAuthentication(a: DeviceAuthenticated | null, b: DeviceAuthenticated | null): boolean {
		if (!a || !b) return false;
		if (a.role === 'judge_advisor' && b.role === 'judge_advisor') return true;
		return a.role === 'judge' && b.role === 'judge' && a.judgeId === b.judgeId;
	}

	const matchingDevices = $derived(
		devices.filter((device) => sameAuthentication(device.authenticated, currentDevice?.authenticated ?? null))
	);
	const otherMatchingDevices = $derived(matchingDevices.filter((device) => device.deviceId !== permit?.deviceId));

	$effect(() => {
		if (personalAccessUrl) {
			(async () => {
				qrCodeDataUrl = await generateQrCodeDataUrl(personalAccessUrl, {
					width: (41 + 2 + 2) * 4,
					margin: 2,
					color: {
						dark: '#000000',
						light: '#FFFFFF'
					},
					errorCorrectionLevel: 'M'
				});
			})();
		}
	});

	function revealSecrets() {
		secretsVisible = true;
		copyButtonText = m.copy();
	}

	async function handleAccessLinkAction() {
		if (!secretsVisible) {
			revealSecrets();
			return;
		}
		try {
			await navigator.clipboard.writeText(personalAccessUrl);
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

	function getConnectionDuration(connectedAt: number): string {
		const now = Date.now();
		const duration = now - connectedAt;
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

	async function handleRotateLink() {
		if (!isJudgeAdvisor) return;

		const confirmed = await dialogs.showConfirmation({
			title: m.rotate_access_link(),
			message: m.rotate_judge_advisor_access_link_confirm(),
			confirmText: m.rotate_access_link(),
			confirmButtonClass: 'danger'
		});
		if (!confirmed) return;

		try {
			const { authToken } = await app.wrpcClient.access.rotateJudgeAdvisorAuth.mutation();
			const accessLink = app.getJudgesRoomUrl(authToken);
			await dialogs.showCustom(AccessLinkVerifyDialog, {
				props: { accessLink },
				maxWidth: 'max-w-xl'
			});
		} catch (error) {
			console.error('Failed to rotate access link:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}

	async function handleKickDevice(targetDeviceId: string) {
		try {
			await app.kickDevice(targetDeviceId);
		} catch (error) {
			console.error('Failed to kick device:', error);
		}
	}

	function deviceRow(device: DeviceInfo) {
		return {
			name: device.deviceName,
			duration: getConnectionDuration(device.connectedAt),
			isOnline: device.isOnline
		};
	}

	onMount(() => {
		app.wrpcClient.device.subscribeDeviceList.mutation().then((list) => {
			app.handleDeviceListUpdate(list);
		});
	});

	onDestroy(() => {
		app.wrpcClient.device.unsubscribeDeviceList.mutation();
	});
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-4xl p-4!">
	<div class="flex flex-col overflow-auto p-2">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h3 id="dialog-title" class="min-w-0 flex-1 truncate text-lg font-medium text-gray-900">
				{m.devices()}
			</h3>
			<div class="flex shrink-0 items-center gap-2">
				{#if isJudgeAdvisor}
					<button type="button" onclick={() => void handleRotateLink()} class="lightweight tiny">
						{m.rotate_access_link()}
					</button>
				{/if}
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
					<button
						type="button"
						class="group relative inline-block rounded-lg bg-gray-50 p-4"
						onclick={revealSecrets}
						disabled={secretsVisible}
					>
						<div class={secretsVisible ? '' : 'blur-xs select-none'}>
							{#if qrCodeDataUrl}
								<img src={qrCodeDataUrl} alt="" class="h-48 w-48 rounded" draggable="false" />
							{:else}
								<div class="flex h-48 w-48 items-center justify-center text-sm text-gray-500"></div>
							{/if}
						</div>
						{#if !secretsVisible}
							<div
								class="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-50/40 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<span class="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm">{m.click_to_show()}</span>
							</div>
						{/if}
					</button>
				</div>

				<div>
					<label for="personal-access-url" class="mb-2 block text-sm font-medium text-gray-700">{m.your_access_link()}</label>
					<div class="flex items-center space-x-2">
						<input
							id="personal-access-url"
							type="text"
							value={secretsVisible ? personalAccessUrl : '••••••••••••••••••••••••••••••••'}
							readonly
							class="classic min-w-0 flex-1 {secretsVisible ? '' : 'select-none'}"
						/>
						{#if showAccessLinkAction}
							<button onclick={handleAccessLinkAction} class="primary tiny">
								{accessLinkActionLabel}
							</button>
						{/if}
					</div>
				</div>

				<div class="rounded-lg bg-slate-50 p-4">
					<div class="text-sm text-slate-800">
						<p class="text-xs">{m.devices_access_link_instructions()}</p>
					</div>
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
				{:else if matchingDevices.length === 0}
					<div class="py-8 text-center text-gray-500">
						<ClientsIcon />
						<p class="mt-2 text-sm">{m.no_devices_currently_connected()}</p>
					</div>
				{:else}
					<div class="space-y-3">
						<h5 class="text-sm font-medium text-gray-700">{m.current_device()}</h5>
						{#if currentDevice && matchingDevices.some((device) => device.deviceId === currentDevice.deviceId)}
							{@const row = deviceRow(currentDevice)}
							<div class="flex items-center justify-between rounded-lg bg-blue-50 p-3">
								<div class="flex items-center space-x-3">
									<div class="h-2 w-2 rounded-full bg-blue-500"></div>
									<div>
										<div class="font-medium text-gray-900">{row.name}</div>
										<div class="text-xs text-gray-500">
											{m.connected_ago({ duration: row.duration })}
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>

					{#if otherMatchingDevices.length > 0}
						<div class="flex min-h-0 flex-col space-y-3">
							<h5 class="text-sm font-medium text-gray-700">{m.other_devices()}</h5>

							<div class="min-h-0 space-y-3 overflow-hidden pr-1 lg:overflow-auto">
								{#each otherMatchingDevices as device (device.deviceId)}
									{@const row = deviceRow(device)}
									<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
										<div class="flex items-center space-x-3">
											{#if row.isOnline}
												<div class="h-2 w-2 rounded-full bg-green-500"></div>
											{:else}
												<div class="h-2 w-2 rounded-full bg-red-500"></div>
											{/if}
											<div>
												<div class="font-medium text-gray-900">{row.name}</div>
												<div class="text-xs text-gray-500">
													{m.joined_ago({ duration: row.duration })}
												</div>
											</div>
										</div>
										{#if isJudgeAdvisor}
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
				{/if}
			</div>
		</div>
	</div>
</Dialog>
