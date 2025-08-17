<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import type { ConnectionState } from '@judging.jerryio/wrpc/client';

	interface Props {
		showDetails?: boolean;
	}

	let { showDetails = false }: Props = $props();

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let isInSession = $derived(app.isInSession());

	function getStatusColor(state: ConnectionState): string {
		switch (state) {
			case 'connected':
				return 'bg-green-500';
			case 'connecting':
			case 'reconnecting':
				return 'bg-yellow-500';
			case 'error':
				return 'bg-red-500';
			case 'offline':
				return 'bg-gray-400';
			default:
				return 'bg-gray-400';
		}
	}

	function getStatusText(state: ConnectionState): string {
		if (!isInSession) {
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
		{#if showDetails}
			<span class="text-xs text-gray-600">{getStatusText(connectionState)}</span>
		{/if}
	</div>

	{#if showDetails && isInSession}
		<!-- Offline mode indicator -->
		{#if !isInSession}
			<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"> Offline Mode </span>
		{/if}

		<!-- Connection issues indicator -->
		{#if connectionState === 'error'}
			<span class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700"> Connection Issues </span>
		{/if}

		<!-- Submission disabled indicator -->
		{#if connectionState !== 'connected' && isInSession}
			<span class="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700"> Submissions Disabled </span>
		{/if}
	{/if}
</div>
