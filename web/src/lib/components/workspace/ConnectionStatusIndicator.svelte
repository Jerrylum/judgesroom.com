<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { app } from '#lib/index.svelte.ts';
	import type { ConnectionState } from '@jerrylum/wrpc/client';
	import { translateConnectionCloseReason } from '#lib/app.svelte.ts';
	import { errorToString } from '#lib/utils.svelte.ts';
	import { WebSocketConnectionFailedCloseReason } from '@judgesroom.com/protocol/src/room-id';

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let isJudgesRoomJoined = $derived(app.isJudgesRoomJoined());
	let canRetry = $derived(connectionState === 'error' && isJudgesRoomJoined);

	function getStatusColor(state: ConnectionState): string {
		switch (state) {
			case 'connected':
				return 'bg-green-500';
			case 'connecting':
			case 'reconnecting':
				return 'bg-red-500';
			case 'error':
				return 'bg-red-900';
			case 'offline':
				return 'bg-gray-400';
			default:
				return 'bg-gray-400';
		}
	}

	function getStatusText(state: ConnectionState): string {
		if (!isJudgesRoomJoined) {
			return 'Offline Mode';
		}

		switch (state) {
			case 'connected':
				return m.connected();
			case 'connecting':
				return m.connecting();
			case 'reconnecting':
				return m.reconnecting();
			case 'error':
				return m.connection_error();
			case 'offline':
				return m.offline();
			default:
				return m.unknown();
		}
	}

	async function handleRetryConnection() {
		try {
			await app.resumeJudgesRoom();
		} catch (error) {
			const reason = errorToString(error);

			// No need to show a message for this error.
			if (reason === WebSocketConnectionFailedCloseReason) return;

			const message = translateConnectionCloseReason(reason);
			if (message) {
				app.addErrorNotice(message);
			}
		}
	}
</script>

<!-- Connection Status Indicator -->
<div class="flex items-center space-x-2">
	<!-- Status dot -->
	<div class="flex items-center space-x-1 pl-2">
		<div class="h-2 w-2 rounded-full {getStatusColor(connectionState)}"></div>
		{#if canRetry}
			<button type="button" class="text-xs text-nowrap text-red-800 underline" onclick={handleRetryConnection}>
				{m.retry_connection()}
			</button>
		{:else}
			<span class="text-xs text-nowrap text-gray-600">{getStatusText(connectionState)}</span>
		{/if}
	</div>
</div>
