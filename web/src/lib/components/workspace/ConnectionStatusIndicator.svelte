<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app } from '$lib/index.svelte';
	import type { ConnectionState } from '@judgesroom.com/wrpc/client';

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let isJudgesRoomJoined = $derived(app.isJudgesRoomJoined());

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
</script>

<!-- Connection Status Indicator -->
<div class="flex items-center space-x-2">
	<!-- Status dot -->
	<div class="flex items-center space-x-1">
		<div class="h-2 w-2 rounded-full {getStatusColor(connectionState)}"></div>
		<span class="text-xs text-gray-600">{getStatusText(connectionState)}</span>
	</div>
</div>
