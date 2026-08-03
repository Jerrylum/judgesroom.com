<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const roomId = params.get('roomId');
		const auth = params.get('auth');
		if (roomId) {
			const next = new URLSearchParams({ roomId });
			if (auth) next.set('auth', auth);
			goto(`/app?${next.toString()}`, { replaceState: true });
		} else {
			goto('/app', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Join the Judges' Room</title>
</svelte:head>
