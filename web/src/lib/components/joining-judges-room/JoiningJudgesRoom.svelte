<script lang="ts">
	import { app, AppUI } from '$lib/index.svelte';

	// Watch for app data to become available and transition UI automatically
	$effect(() => {
		if (app.hasEssentialData()) {
			// Data is now available, transition to appropriate state
			const currentUser = app.getCurrentUser();
			if (currentUser) {
				app.selectUser(currentUser);
				AppUI.appPhase = 'workspace';
			} else {
				AppUI.appPhase = 'role_selection';
			}
		}
	});
</script>

<svelte:head>
	<title>Joining | Judges' Room</title>
</svelte:head>

<div class="flex h-screen flex-1 flex-col items-center justify-center text-black">
	<div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-black/30 border-t-black"></div>
	<p class="text-lg">Joining Judges' Room...</p>
</div>
