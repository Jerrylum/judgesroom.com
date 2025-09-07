<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import EventSetup from '$lib/components/event-setup/EventSetup.svelte';
	import Workspace from '$lib/components/workspace/Workspace.svelte';
	import SessionSetup from '$lib/components/SessionSetup.svelte';
	import RoleSelection from '$lib/components/RoleSelection.svelte';
	import Loading from '$lib/components/loading/Loading.svelte';
	import ChooseAction from '$lib/components/choose-action/ChooseAction.svelte';
	import JoiningSession from '$lib/components/joining-session/JoiningSession.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import PromptDialog from '$lib/components/PromptDialog.svelte';
	import { parseSessionUrl } from '$lib/utils.svelte';

	// App state persistence error message

	let errorMessage = $state('');

	// Monitor user state changes
	$effect(() => {
		const currentUser = app.getCurrentUser();
		const clearReason = app.getUserClearReason();

		// Handle role deletion
		if (!currentUser && clearReason === 'role_deleted') {
			// Show confirmation dialog and redirect to role selection
			(async () => {
				await dialogs.showConfirmation({
					title: 'Role No Longer Available',
					message: 'Your judge role has been removed from the event setup. Please select a new role.',
					confirmText: 'OK',
					cancelText: '',
					confirmButtonClass: 'primary'
				});
				AppUI.appPhase = 'role_selection';
			})();
		}
	});

	$inspect(AppUI.appPhase);

	onMount(async () => {
		const hash = window.location.hash;
		// If there is a hash, it means we are trying to join a session from a URL
		if (hash) {
			// Parse the session URL from the hash
			const result = parseSessionUrl(window.location.href);
			const existingSessionInfo = app.getSessionInfo();
			// If the session URL is different from the existing session,
			// leave the current session and join the new one
			if (existingSessionInfo?.sessionId !== result) {
				await handleSessionFromUrl();
			}
		}

		// In other cases, check if we can rejoin a stored session
		// The stored session should be the loaded when the app is loaded
		const existingSessionInfo = app.getSessionInfo();
		if (existingSessionInfo) {
			await rejoinStoredSession();
			return;
		}

		// If we have no session, show the choose action page
		AppUI.appPhase = 'choose_action';
	});

	async function handleSessionFromUrl() {
		try {
			await app.leaveSession();
			await app.joinSessionFromUrl(window.location.href);

			// Clear URL hash for security using SvelteKit navigation
			replaceState('/app', {});

			// Wait for sync to complete
			AppUI.appPhase = 'joining_session';
		} catch (error) {
			console.error('Error joining session from URL:', error);
			errorMessage = `Failed to join session: ${error}`;
			AppUI.appPhase = 'choose_action';
		}
	}

	async function rejoinStoredSession() {
		try {
			await app.reconnectStoredSession();

			AppUI.appPhase = 'joining_session';
		} catch (error) {
			// Session in storage but couldn't reconnect, show choice
			// TODO: handle this case
			console.error('Error rejoining stored session:', error);
			errorMessage = `Failed to rejoin session: ${error}`;
			AppUI.appPhase = 'choose_action';
		}
	}

	let errorNotices = $derived(app.getErrorNotices());
	let currentDialog = $derived(dialogs.currentDialog);

	function dismissError(index: number) {
		app.clearErrorNotice(index);
	}
</script>

<div class="min-h-screen">
	{#if AppUI.appPhase === 'loading'}
		<Loading />
	{:else if AppUI.appPhase === 'choose_action'}
		<ChooseAction {errorMessage} />
	{:else if AppUI.appPhase === 'joining_session'}
		<JoiningSession />
	{:else if AppUI.appPhase === 'event_setup'}
		<EventSetup />
	{:else if AppUI.appPhase === 'session_setup'}
		<SessionSetup />
	{:else if AppUI.appPhase === 'role_selection'}
		<RoleSelection />
	{:else if AppUI.appPhase === 'workspace'}
		<Workspace />
	{/if}

	<!-- Error Notices -->
	{#if errorNotices.length > 0}
		<div class="fixed right-4 bottom-4 z-50 space-y-2">
			{#each errorNotices as notice, index (index)}
				<div class="flex max-w-sm min-w-xs items-center justify-between rounded-lg bg-red-100 p-4 text-red-700 shadow-lg">
					<div class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
						<span class="text-sm">{notice}</span>
					</div>
					<button onclick={() => dismissError(index)} class="ml-2 rounded-full p-1 hover:bg-red-200" aria-label="Dismiss error">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Dialog System -->
	{#if currentDialog}
		{#if currentDialog.type === 'confirmation'}
			<ConfirmationDialog dialog={currentDialog} />
		{:else if currentDialog.type === 'prompt'}
			<PromptDialog dialog={currentDialog} />
		{:else if currentDialog.type === 'custom'}
			{@const Component = currentDialog.component}

			<!-- <svelte:component this={currentDialog.component as any} {...currentDialog.props} /> -->
			<!-- https://svelte.dev/e/svelte_component_deprecated -->
			<Component {...currentDialog.props} />
		{/if}
	{/if}
</div>
