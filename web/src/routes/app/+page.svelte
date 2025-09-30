<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import EventSetup from '$lib/components/event-setup/EventSetup.svelte';
	import Workspace from '$lib/components/workspace/Workspace.svelte';
	import RoleSelection from '$lib/components/role-selection/RoleSelection.svelte';
	import Loading from '$lib/components/loading/Loading.svelte';
	import ChooseAction from '$lib/components/choose-action/ChooseAction.svelte';
	import JoiningSession from '$lib/components/joining-session/JoiningSession.svelte';
	import ConfirmationDialog from '$lib/components/dialog/ConfirmationDialog.svelte';
	import PromptDialog from '$lib/components/dialog/PromptDialog.svelte';
	import { parseSessionUrl } from '$lib/utils.svelte';
	import Notice from '$lib/components/notice/Notice.svelte';

	// App state persistence error message

	let errorMessage = $state('');
	const currentUser = $derived(app.getCurrentUser());
	const currentUserJudge = $derived(app.getCurrentUserJudge());

	// Monitor user state changes
	$effect(() => {
		// Handle role deletion
		if (app.isJudgingReady() && currentUser && currentUser.role === 'judge' && !currentUserJudge) {
			// Show confirmation dialog and redirect to role selection
			app.unselectUser();
			AppUI.appPhase = 'role_selection';
			dialogs.showConfirmation({
				title: 'Role Removed',
				message: 'Your judge role has been removed from the event setup. Please select a new role.',
				confirmText: 'OK',
				cancelText: '',
				confirmButtonClass: 'primary'
			});
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
				return;
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

	let notices = $derived(app.getNotices());
	let currentDialog = $derived(dialogs.currentDialog);

	function dismissNotice(id: string) {
		app.clearNotice(id);
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
	{:else if AppUI.appPhase === 'role_selection'}
		<RoleSelection />
	{:else if AppUI.appPhase === 'workspace'}
		<Workspace />
	{/if}

	<!-- Notices -->
	{#if notices.length > 0}
		<div class="fixed bottom-4 right-4 z-50 space-y-2">
			{#each notices as notice (notice.id)}
				<Notice notice={notice} dismissNotice={dismissNotice} />
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
