<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { app, AppUI, dialogs } from '$lib/index.svelte';
	import EventSetup from '$lib/components/event-setup/EventSetup.svelte';
	import Workspace from '$lib/components/workspace/Workspace.svelte';
	import RoleSelection from '$lib/components/role-selection/RoleSelection.svelte';
	import Loading from '$lib/components/loading/Loading.svelte';
	import Begin from '$lib/components/begin/Begin.svelte';
	import JoiningJudgesRoom from '$lib/components/joining-judges-room/JoiningJudgesRoom.svelte';
	import AlertDialog from '$lib/components/dialog/AlertDialog.svelte';
	import ConfirmationDialog from '$lib/components/dialog/ConfirmationDialog.svelte';
	import PromptDialog from '$lib/components/dialog/PromptDialog.svelte';
	import { parseJudgesRoomUrl } from '$lib/utils.svelte';
	import Notice from '$lib/components/notice/Notice.svelte';
	import Leaving from '$lib/components/leaving/Leaving.svelte';

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
		// If there is a hash, it means we are trying to join a Judges' Room from a URL
		if (hash) {
			// Parse the Judges' Room URL from the hash
			const result = parseJudgesRoomUrl(window.location.href);
			const existingPermit = app.getPermit();
			// If the Judges' Room URL is different from the existing Judges' Room,
			// leave the current Judges' Room and join the new one
			if (existingPermit?.roomId !== result) {
				await handleJudgesRoomUrl();
				return;
			}
		}

		// In other cases, check if we can rejoin a stored permit
		// The stored permit should be the loaded when the app is loaded
		const existingPermit = app.getPermit();
		if (existingPermit) {
			await useStoredPermit();
			return;
		}

		// If we have no permit, show the choose action page
		AppUI.appPhase = 'begin';
	});

	async function handleJudgesRoomUrl() {
		try {
			await app.leaveJudgesRoom();
			await app.joinJudgesRoomFromUrl(window.location.href);

			// Clear URL hash for security using SvelteKit navigation
			replaceState('/app', {});

			// Wait for sync to complete
			AppUI.appPhase = 'joining_judges_room';
		} catch (error) {
			console.error('Error joining Judges\' Room from URL:', error);
			AppUI.appPhase = 'begin';
			dialogs.showAlert({
				title: 'Failed to Join',
				message: `Failed to join Judges' Room: ${error}`,
				confirmButtonClass: 'primary'
			});
		}
	}

	async function useStoredPermit() {
		try {
			await app.joinJudgesRoomWithStoredPermit();

			AppUI.appPhase = 'joining_judges_room';
		} catch (error) {
			// Permit in storage but couldn't be used, show choice
			// TODO: handle this case
			console.error('Error rejoining stored permit:', error);
			AppUI.appPhase = 'begin';
			dialogs.showAlert({
				title: 'Failed to Rejoin',
				message: `Failed to rejoin Judges' Room: ${error}`,
				confirmButtonClass: 'primary'
			});
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
	{:else if AppUI.appPhase === 'begin'}
		<Begin />
	{:else if AppUI.appPhase === 'joining_judges_room'}
		<JoiningJudgesRoom />
	{:else if AppUI.appPhase === 'event_setup'}
		<EventSetup />
	{:else if AppUI.appPhase === 'role_selection'}
		<RoleSelection />
	{:else if AppUI.appPhase === 'workspace'}
		<Workspace />
	{:else if AppUI.appPhase === 'leaving'}
		<Leaving />
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
		{#if currentDialog.type === 'alert'}
			<AlertDialog dialog={currentDialog} />
		{:else if currentDialog.type === 'confirmation'}
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
