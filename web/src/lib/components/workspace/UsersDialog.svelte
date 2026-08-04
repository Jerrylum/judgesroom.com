<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, dialogs } from '$lib/index.svelte';
	import CopyIcon from '$lib/icon/CopyIcon.svelte';
	import DenialIcon from '$lib/icon/DenialIcon.svelte';
	import RotateIcon from '$lib/icon/RotateIcon.svelte';
	import UsersIcon from '$lib/icon/UsersIcon.svelte';
	import XmarkIcon from '$lib/icon/XmarkIcon.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import AccessLinkVerifyDialog from '$lib/components/access/AccessLinkVerifyDialog.svelte';
	import { canUseClipboard } from '$lib/utils.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { AccessLinks } from '@judgesroom.com/protocol/src/access';
	import type { DeviceInfo } from '@judgesroom.com/protocol/src/client';

	const clipboardAvailable = canUseClipboard();

	type UserRow = {
		key: string;
		name: string;
		authToken: string;
		kind: 'judge_advisor' | 'judge';
		judgeId?: string;
	};

	let accessLinks = $state<AccessLinks | null>(null);
	let loadingLinks = $state(false);
	let copiedKey = $state<string | null>(null);

	const devices = $derived(app.getDevices());
	const connectionState = $derived(app.getConnectionState());
	const permit = $derived(app.getPermit());
	const isDisconnectedFromServer = $derived(connectionState !== 'connected');

	const userRows = $derived.by((): UserRow[] => {
		if (!accessLinks) return [];
		return [
			{
				key: 'judge_advisor',
				name: m.judge_advisor(),
				authToken: accessLinks.judgeAdvisorAuthToken,
				kind: 'judge_advisor'
			},
			...accessLinks.judges.map((judge) => ({
				key: judge.judgeId,
				name: judge.name,
				authToken: judge.authToken,
				kind: 'judge' as const,
				judgeId: judge.judgeId
			}))
		];
	});

	function devicesForUser(user: UserRow): DeviceInfo[] {
		return devices.filter((device) => {
			const auth = device.authenticated;
			if (!auth) return false;
			if (user.kind === 'judge_advisor') return auth.role === 'judge_advisor';
			return auth.role === 'judge' && auth.judgeId === user.judgeId;
		});
	}

	function onlineCount(user: UserRow): number {
		return devicesForUser(user).filter((device) => device.isOnline).length;
	}

	async function loadAccessLinks() {
		loadingLinks = true;
		try {
			accessLinks = await app.wrpcClient.access.listAccessLinks.query();
		} catch (error) {
			console.error('Failed to load access links:', error);
		} finally {
			loadingLinks = false;
		}
	}

	async function copyUserLink(user: UserRow) {
		try {
			await navigator.clipboard.writeText(app.getJudgesRoomUrl(user.authToken));
			copiedKey = user.key;
			setTimeout(() => {
				if (copiedKey === user.key) copiedKey = null;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy URL:', error);
		}
	}

	async function rotateUserLink(user: UserRow) {
		const confirmed = await dialogs.showConfirmation({
			title: m.rotate_access_link(),
			message:
				user.kind === 'judge_advisor' ? m.rotate_judge_advisor_access_link_confirm() : m.rotate_access_link_confirm(),
			confirmText: m.rotate_access_link(),
			confirmButtonClass: 'danger'
		});
		if (!confirmed) return;

		if (user.kind === 'judge_advisor') {
			const { authToken } = await app.wrpcClient.access.rotateJudgeAdvisorAuth.mutation();
			const accessLink = app.getJudgesRoomUrl(authToken);
			await loadAccessLinks();
			await dialogs.showCustom(AccessLinkVerifyDialog, {
				props: { accessLink },
				maxWidth: 'max-w-xl'
			});
			return;
		}

		if (!user.judgeId) return;
		await app.wrpcClient.access.rotateJudgeAuth.mutation({ judgeId: user.judgeId });
		await loadAccessLinks();
	}

	async function handleKickDevice(targetDeviceId: string) {
		try {
			await app.kickDevice(targetDeviceId);
		} catch (error) {
			console.error('Failed to kick device:', error);
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

	onMount(() => {
		app.wrpcClient.device.subscribeDeviceList.mutation().then((list) => {
			app.handleDeviceListUpdate(list);
		});
		void loadAccessLinks();
	});

	onDestroy(() => {
		app.wrpcClient.device.unsubscribeDeviceList.mutation();
	});
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-2xl p-4!">
	<div class="flex max-h-[80vh] flex-col overflow-hidden p-2">
		<div class="mb-4 flex shrink-0 items-center justify-between">
			<h3 id="dialog-title" class="flex items-center gap-2 text-lg font-medium text-gray-900">
				{m.users()}
			</h3>
			<button onclick={handleClose} class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close dialog">
				<XmarkIcon size={18} />
			</button>
		</div>

		<p class="mb-4 shrink-0 text-xs text-gray-600">{m.users_dialog_description()}</p>

		{#if isDisconnectedFromServer}
			<div class="mb-4 rounded-lg bg-red-50 p-4">
				<div class="flex items-center space-x-2 text-red-800">
					<DenialIcon />
					<div>
						<h5 class="font-medium">{m.connection_error()}</h5>
						<p class="text-sm">{m.you_are_disconnected_from_the_server()}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if loadingLinks}
			<p class="text-sm text-gray-500">…</p>
		{:else if accessLinks}
			<div class="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
				{#each userRows as user (user.key)}
					{@const userDevices = devicesForUser(user)}
					{@const online = onlineCount(user)}
					<div class="rounded-lg border border-gray-200">
						<div class="flex items-center gap-3 px-3 py-2.5">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<div class="truncate text-sm font-medium text-gray-900">{user.name}</div>
									{#if online > 0}
										<span class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
											<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
											{m.online_device_count({ count: online })}
										</span>
									{:else}
										<span class="text-xs text-gray-400">{m.no_devices_online()}</span>
									{/if}
								</div>
							</div>
							<div class="flex shrink-0 items-center gap-1">
								{#if clipboardAvailable}
									<button
										type="button"
										onclick={() => copyUserLink(user)}
										class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
										title={copiedKey === user.key ? m.copied() : m.copy_access_link()}
										aria-label={m.copy_access_link()}
									>
										<CopyIcon size={14} class={copiedKey === user.key ? 'text-green-600' : ''} />
									</button>
								{/if}
								<button
									type="button"
									onclick={() => rotateUserLink(user)}
									class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
									title={m.rotate_access_link()}
									aria-label={m.rotate_access_link()}
								>
									<RotateIcon size={14} />
								</button>
							</div>
						</div>

						{#if userDevices.length > 0}
							<ul class="border-t border-gray-100 bg-gray-50/80 px-3 py-2">
								{#each userDevices as device (device.deviceId)}
									<li class="flex items-center justify-between gap-2 py-1.5">
										<div class="flex min-w-0 items-center gap-2">
											{#if device.isOnline}
												<span class="h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
											{:else}
												<span class="h-2 w-2 shrink-0 rounded-full bg-gray-300"></span>
											{/if}
											<div class="min-w-0">
												<div class="truncate text-sm text-gray-800">
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
												class="rounded-full p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
												title={m.kick_device()}
												aria-label={m.kick_device()}
											>
												<XmarkIcon size={12} />
											</button>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</Dialog>
