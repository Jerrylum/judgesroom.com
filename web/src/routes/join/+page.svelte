<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { app, AppUI, dialogs } from '$lib/index.svelte';

	onMount(() => {
		const roomId = new URLSearchParams(window.location.search).get('roomId');
		if (roomId) {
			goto(`/app#${roomId}`, { replaceState: true });
		} else {
			goto('/app', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Join the Judges' Room</title>
</svelte:head>
