<script lang="ts">
	import QRCode from 'qrcode';
	import type { DeviceInfo } from '@judging.jerryio/protocol/src/client';
	import { app, dialogs } from '$lib/app-page.svelte';
	import ClientsIcon from '$lib/icon/ClientsIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import DenialIcon from '$lib/icon/DenialIcon.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	let qrCodeDataUrl = $state('');
	let copyButtonText = $state('Copy');

	const devices = $derived(app.getDevices());
	const connectionState = $derived(app.getConnectionState());
	const currentUser = $derived(app.getCurrentUser());
	const sessionInfo = $derived(app.getSessionInfo());
	const shareableUrl = $derived(app.getSessionUrl());

	// Check if we're disconnected from server
	function isDisconnectedFromServer(): boolean {
		return connectionState !== 'connected';
	}

	// Get current device info
	function getCurrentDevice(): Readonly<DeviceInfo> | null {
		if (!sessionInfo) return null;
		return devices.find((device) => device.deviceId === sessionInfo.deviceId) || null;
	}

	// Get other devices (excluding current device)
	function getOtherDevices(): DeviceInfo[] {
		if (!sessionInfo) return [];
		return devices.filter((device) => device.deviceId !== sessionInfo.deviceId);
	}

	// Check if current user is judge advisor
	function isJudgeAdvisor(): boolean {
		return currentUser?.role === 'judge_advisor';
	}

	// Handle kick device
	async function handleKickDevice(targetDeviceId: string) {
		try {
			await app.kickDevice(targetDeviceId);
		} catch (error) {
			console.error('Failed to kick device:', error);
		}
	}

	// Generate QR code when URL changes
	$effect(() => {
		if (shareableUrl) {
			(async () => {
				qrCodeDataUrl = await QRCode.toDataURL(shareableUrl, {
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

	async function copyShareUrl() {
		if (shareableUrl) {
			try {
				await navigator.clipboard.writeText(shareableUrl);
				copyButtonText = 'Copied!';
				setTimeout(() => {
					copyButtonText = 'Copy';
				}, 2000);
			} catch (error) {
				console.error('Failed to copy URL:', error);
				copyButtonText = 'Failed';
				setTimeout(() => {
					copyButtonText = 'Copy';
				}, 2000);
			}
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
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-4xl p-4!">
	<div class="flex flex-col overflow-auto p-2">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">Session Management</h3>
			<button onclick={handleClose} class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close dialog">
				<CloseIcon size={24} />
			</button>
		</div>

		<div class="flex shrink-0 flex-col gap-6 overflow-hidden md:flex-row">
			<!-- Left Column: Share Session -->
			<div class="max-h-140 flex-1 space-y-6">
				<h4 class="text-lg font-medium text-gray-900">Share Session</h4>

				<!-- QR Code Section -->
				<div class="text-center">
					<div class="mb-3">
						<h5 class="text-sm font-medium text-gray-700">Scan QR Code</h5>
					</div>
					<div class="inline-block rounded-lg bg-gray-50 p-4">
						{#if qrCodeDataUrl}
							<img src={qrCodeDataUrl} alt="QR Code for session link" class="h-48 w-48 rounded" />
						{:else}
							<div class="flex h-48 w-48 items-center justify-center text-sm text-gray-500"></div>
						{/if}
					</div>
				</div>

				<!-- URL Section -->
				<div>
					<label for="session-url" class="mb-2 block text-sm font-medium text-gray-700">Session Link </label>
					<div class="flex items-center space-x-2">
						<input id="session-url" type="text" value={shareableUrl} readonly class="classic flex-1" />
						<button onclick={copyShareUrl} class="primary tiny">
							{copyButtonText}
						</button>
					</div>
				</div>

				<!-- Instructions -->
				<div class="rounded-lg bg-blue-50 p-4">
					<div class="text-sm text-blue-800">
						<h5 class="mb-2 font-medium">How to share:</h5>
						<ul class="space-y-1 text-xs">
							<li>• Send the link to other judges to invite them to join</li>
							<li>• Or have them scan the QR code with their phone camera</li>
							<li>• All participants will see real-time updates</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Right Column: Connected Devices -->
			<div class="flex lg:max-h-140 flex-1 flex-col space-y-4 overflow-hidden">
				<h4 class="text-lg font-medium text-gray-900">Connected Devices</h4>

				{#if isDisconnectedFromServer()}
					<div class="rounded-lg bg-red-50 p-4">
						<div class="flex items-center space-x-2 text-red-800">
							<DenialIcon />
							<div>
								<h5 class="font-medium">Connection Error</h5>
								<p class="text-sm">You are disconnected from the server. This may be due to a network issue.</p>
							</div>
						</div>
					</div>
				{:else if devices.length === 0}
					<div class="py-8 text-center text-gray-500">
						<ClientsIcon />
						<p class="mt-2 text-sm">No devices currently connected</p>
					</div>
				{:else}
					<!-- Current Device Section -->
					<div class="space-y-3">
						<h5 class="text-sm font-medium text-gray-700">Current Device</h5>
						{#if getCurrentDevice()}
							<div class="flex items-center justify-between rounded-lg bg-blue-50 p-3">
								<div class="flex items-center space-x-3">
									<div class="h-2 w-2 rounded-full bg-blue-500"></div>
									<div>
										<div class="font-medium text-gray-900">{getCurrentDevice()!.deviceName}</div>
										<div class="text-xs text-gray-500">
											Connected {getConnectionDuration(getCurrentDevice()!.connectedAt)} ago
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Other Devices Section -->
					{#if getOtherDevices().length > 0}
						<div class="flex min-h-0 flex-col space-y-3">
							<h5 class="text-sm font-medium text-gray-700">Other Devices</h5>

							<div class="min-h-0 space-y-3 overflow-hidden pr-1 lg:overflow-auto">
								{#each getOtherDevices() as device (device.deviceId)}
									<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
										<div class="flex items-center space-x-3">
											{#if device.isOnline}
												<div class="h-2 w-2 rounded-full bg-green-500"></div>
											{:else}
												<div class="h-2 w-2 rounded-full bg-red-500"></div>
											{/if}
											<div>
												<div class="font-medium text-gray-900">{device.deviceName}</div>
												<div class="text-xs text-gray-500">
													Joined {getConnectionDuration(device.connectedAt)} ago
												</div>
											</div>
										</div>
										{#if isJudgeAdvisor()}
											<button
												onclick={() => handleKickDevice(device.deviceId)}
												class="rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
												title="Kick device"
												aria-label="Kick device"
											>
												<CloseIcon size={16} />
											</button>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- End Session Button (Judge Advisor Only) -->
					<!-- {#if isJudgeAdvisor()}
						<div class="pt-4">
							<button onclick={handleEndSession} class="danger tiny w-full">End Session</button>
						</div>
					{/if} -->
				{/if}
			</div>
		</div>
	</div>
</Dialog>
