<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import type { ConnectionState } from '@judging.jerryio/wrpc/client';

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let isSessionJoined = $derived(app.isSessionJoined());

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
		if (!isSessionJoined) {
			return 'Offline Mode';
		}

		switch (state) {
			case 'connected':
				return 'Connected';
			case 'connecting':
				return 'Connecting...';
			case 'reconnecting':
				return 'Reconnecting...';
			case 'error':
				return 'Connection Error';
			case 'offline':
				return 'Offline';
			default:
				return 'Unknown';
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
