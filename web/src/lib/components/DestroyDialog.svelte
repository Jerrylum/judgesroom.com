<script lang="ts">
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import Dialog from '$lib/components/Dialog.svelte';

	let deleteConfirmText = $state('');
	// let isSessionEnded = $state(false);
	let isDestroying = $state(false);
	// let hasEndedSession = $state(false);

	const isJudgingReady = $derived(app.isJudgingReady());
	// const connectionState = $derived(app.getConnectionState());
	// const isConnected = $derived(connectionState === 'connected');
	// const canEndSession = $derived(isInSession && isConnected && !hasEndedSession);
	// const canDestroy = $derived(!isInSession || hasEndedSession);
	const canDestroy = $derived(true);
	const isDeleteConfirmValid = $derived(deleteConfirmText.trim().toLowerCase() === 'delete');

	// async function handleEndSession() {
	// 	if (!canEndSession) return;

	// 	try {
	// 		await app.leaveSession();
	// 		hasEndedSession = true;
	// 	} catch (error) {
	// 		console.error('Failed to end session:', error);
	// 		// TODO: Show error message
	// 	}
	// }

	async function handleDestroy() {
		if (!canDestroy || !isDeleteConfirmValid) return;

		try {
			isDestroying = true;

			// Destroy all app data
			app.destroySessionData();

			// Close dialog and go to choose action
			dialogs.closeDialog(true);
			AppUI.appPhase = 'choose_action';
		} catch (error) {
			console.error('Failed to destroy data:', error);
			// TODO: Show error message
		} finally {
			isDestroying = false;
		}
	}

	function handleCancel() {
		dialogs.closeDialog(false);
	}
</script>

<Dialog open={true} onClose={handleCancel}>
	<div class="space-y-6">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">Destroy Judging Data</h3>
			<p class="mt-2 text-sm text-gray-600">
				Prior to the award ceremony, the Judge Advisor should secure the Judges' Room and destroy all judging materials. These items are not
				to be given to the Event Partner for destruction.
			</p>
		</div>

		<!-- Warning Message -->
		<div class="rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Warning</h3>
					<div class="mt-2 text-sm text-red-700">
						<p>
							This action will permanently destroy all judging data including team evaluations, rankings, and notes. Make sure all connected
							devices have completed judging and all data has been properly collected before proceeding.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Session Management Section -->
		<!-- {#if isInSession}
			<div class="space-y-3">
				<h4 class="text-sm font-medium text-gray-900">Step 1: End Session</h4>
				<p class="text-sm text-gray-600">
					End the judging session to disconnect all participants. This must be done before destroying data.
				</p>
				
				{#if hasEndedSession}
					<div class="flex items-center rounded-md bg-green-50 p-3">
						<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="ml-2 text-sm text-green-800">Session ended successfully</span>
					</div>
				{:else}
					<button
						onclick={handleEndSession}
						disabled={!canEndSession}
						class="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if !isConnected}
							Already Offline
						{:else}
							End Session
						{/if}
					</button>
				{/if}
			</div>
		{/if} -->

		<!-- Data Destruction Section -->
		<div class="space-y-3">
			<h4 class="text-sm font-medium text-gray-900">
				{isJudgingReady ? 'Step 2: ' : ''}Destroy Data
			</h4>
			<p class="text-sm text-gray-600">Type "delete" below to confirm the permanent destruction of all judging data.</p>

			<div>
				<label for="deleteConfirm" class="block text-sm font-medium text-gray-700"> Confirmation </label>
				<input
					id="deleteConfirm"
					type="text"
					bind:value={deleteConfirmText}
					disabled={!canDestroy}
					placeholder="Type 'delete' to confirm"
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
				/>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex justify-end space-x-3">
			<button
				onclick={handleCancel}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				onclick={handleDestroy}
				disabled={!canDestroy || !isDeleteConfirmValid || isDestroying}
				class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isDestroying}
					Destroying...
				{:else}
					Destroy All Data
				{/if}
			</button>
		</div>
	</div>
</Dialog>
