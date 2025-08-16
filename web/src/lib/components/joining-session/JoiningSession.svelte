<script lang="ts">
	import { app, AppUI } from '$lib/app-page.svelte';

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

<div class="flex flex-1 flex-col items-center justify-center text-white">
	<div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
	<p class="text-lg">Joining session...</p>
</div>
