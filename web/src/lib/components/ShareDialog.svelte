<script lang="ts">
	import QRCode from 'qrcode';
	import type { ClientInfo } from '@judging.jerryio/protocol/src/client';
	import { app, dialogs } from '$lib/app-page.svelte';
	import ClientsIcon from '$lib/icon/ClientsIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import DenialIcon from '$lib/icon/DenialIcon.svelte';
	import Dialog from '$lib/components/Dialog.svelte';

	let qrCodeDataUrl = $state('');
	let copyButtonText = $state('Copy');

	const clients = $derived(app.getClients());
	const connectionState = $derived(app.getConnectionState());
	const currentUser = $derived(app.getCurrentUser());
	const sessionInfo = $derived(app.getSessionInfo());
	const shareableUrl = $derived(app.getSessionUrl());

	// Check if we're disconnected from server
	function isDisconnectedFromServer(): boolean {
		return connectionState !== 'connected';
	}

	// Get current client info
	function getCurrentClient(): Readonly<ClientInfo> | null {
		if (!sessionInfo) return null;
		return clients.find((client) => client.clientId === sessionInfo.clientId) || null;
	}

	// Get other clients (excluding current client)
	function getOtherClients(): ClientInfo[] {
		if (!sessionInfo) return [];
		return clients.filter((client) => client.clientId !== sessionInfo.clientId);
	}

	// Check if current user is judge advisor
	function isJudgeAdvisor(): boolean {
		return currentUser?.role === 'judge_advisor';
	}

	// Handle kick client
	async function handleKickClient(targetClientId: string) {
		try {
			await app.kickClient(targetClientId);
		} catch (error) {
			console.error('Failed to kick client:', error);
		}
	}

	// // Handle end session
	// async function handleEndSession() {
	// 	const confirmed = await dialogs.showConfirmation({
	// 		title: 'End Session',
	// 		message:
	// 			'Are you sure you want to end the session? All participants will be disconnected immediately. Only this device will retain the complete judging data - all other connected devices will lose their local copies.',
	// 		confirmText: 'End Session',
	// 		cancelText: 'Cancel',
	// 		confirmButtonClass: 'danger'
	// 	});

	// 	if (confirmed) {
	// 		try {
	// 			await app.endSession();
	// 			dialogs.closeDialog();
	// 		} catch (error) {
	// 			console.error('Failed to end session:', error);
	// 		}
	// 	}
	// }

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
			<h3 id="share-dialog-title" class="text-lg font-medium text-gray-900">Session Management</h3>
			<button
				onclick={handleClose}
				class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				aria-label="Close dialog"
			>
				<CloseIcon size={24} />
			</button>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Left Column: Share Session -->
			<div class="max-h-173 space-y-6">
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
					<label for="session-url" class="mb-2 block text-sm font-medium text-gray-700">
						Session Link
					</label>
					<div class="flex items-center space-x-2">
						<input
							id="session-url"
							type="text"
							value={shareableUrl}
							readonly
							class="classic flex-1"
						/>
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

			<!-- Right Column: Connected Clients -->
			<div class="max-h-173 space-y-4 overflow-y-auto">
				<h4 class="text-lg font-medium text-gray-900">Connected Clients</h4>

				{#if isDisconnectedFromServer()}
					<div class="rounded-lg bg-red-50 p-4">
						<div class="flex items-center space-x-2 text-red-800">
							<DenialIcon />
							<div>
								<h5 class="font-medium">Connection Error</h5>
								<p class="text-sm">
									You are disconnected from the server. This may be due to a network issue.
								</p>
							</div>
						</div>
					</div>
				{:else if clients.length === 0}
					<div class="py-8 text-center text-gray-500">
						<ClientsIcon />
						<p class="mt-2 text-sm">No clients currently connected</p>
					</div>
				{:else}
					<!-- Current Client Section -->
					<div class="space-y-3">
						<h5 class="text-sm font-medium text-gray-700">Current Client</h5>
						{#if getCurrentClient()}
							<div class="flex items-center justify-between rounded-lg bg-blue-50 p-3">
								<div class="flex items-center space-x-3">
									<div class="h-2 w-2 rounded-full bg-blue-500"></div>
									<div>
										<div class="font-medium text-gray-900">{getCurrentClient()!.deviceName}</div>
										<div class="text-xs text-gray-500">
											Connected {getConnectionDuration(getCurrentClient()!.connectedAt)} ago
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Other Clients Section -->
					{#if getOtherClients().length > 0}
						<div class="space-y-3">
							<h5 class="text-sm font-medium text-gray-700">Other Clients</h5>
							{#each getOtherClients() as client (client.clientId)}
								<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
									<div class="flex items-center space-x-3">
										<!-- <div class="h-2 w-2 rounded-full bg-green-500"></div> -->
										{#if client.isOnline}
											<div class="h-2 w-2 rounded-full bg-green-500"></div>
										{:else}
											<div class="h-2 w-2 rounded-full bg-red-500"></div>
										{/if}
										<div>
											<div class="font-medium text-gray-900">{client.deviceName}</div>
											<div class="text-xs text-gray-500">
												Joined {getConnectionDuration(client.connectedAt)} ago
											</div>
										</div>
									</div>
									{#if isJudgeAdvisor()}
										<button
											onclick={() => handleKickClient(client.clientId)}
											class="rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
											title="Kick client"
											aria-label="Kick client"
										>
											<CloseIcon size={16} />
										</button>
									{/if}
								</div>
							{/each}
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
