<script lang="ts">
	import { app, AppUI } from '$lib/index.svelte';
	import { onMount } from 'svelte';

	// This app phase is important to trigger unmounting before calling leaveJudgesRoom
  // However, the unsubscribe request might not be sent successfully, it does not matter much

	onMount(async () => {
		await app.leaveJudgesRoom();
		AppUI.appPhase = 'begin';
	});
</script>

<div class="flex h-screen flex-1 flex-col items-center justify-center text-black">
	<div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-black/30 border-t-black"></div>
	<p class="text-lg">Leaving Judges' Room...</p>
</div>
