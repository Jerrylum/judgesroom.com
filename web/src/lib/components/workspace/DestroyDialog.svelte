<script lang="ts">
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	let destroyConfirmText = $state('');
	let isDestroying = $state(false);

	const canDestroy = $derived(true);
	const isDestroyConfirmValid = $derived(destroyConfirmText.trim().toLowerCase() === 'destroy');

	async function handleDestroy() {
		if (!canDestroy || !isDestroyConfirmValid) return;

		try {
			isDestroying = true;

			// Destroy all app data
			app.destroyJudgesRoomData();

			// Close dialog destroyJudgesRoomDataPhase = 'begin';
		} catch (error) {
			console.error('Failed to destroy data:', error);
			app.addErrorNotice('CRITICAL: Failed to destroy data');
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
			<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">Destroy Judging Data</h3>
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

		<!-- Data Destruction Section -->
		<div class="space-y-3">
			<p class="text-sm text-gray-600">Type "destroy" below to confirm the permanent destruction of all judging data.</p>

			<div>
				<label for="destroyConfirm" class="block text-sm font-medium text-gray-700">Confirmation </label>
				<input
					id="destroyConfirm"
					type="text"
					bind:value={destroyConfirmText}
					disabled={!canDestroy}
					placeholder="Type 'destroy' to confirm"
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
				disabled={!canDestroy || !isDestroyConfirmValid || isDestroying}
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
