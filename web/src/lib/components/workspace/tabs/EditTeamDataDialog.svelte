<script lang="ts">
	import { app, dialogs } from '$lib/app-page.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';

	interface Props {
		team: Readonly<TeamInfoAndData>;
	}

	let { team }: Props = $props();

	// Clone the team data for editing
	let editedTeam = $state({
		notebookLink: team.notebookLink || '',
		absent: team.absent || false
	});

	// Validation states
	let validationError = $state('');
	let isSaving = $state(false);

	// Validation function
	function validateTeam(): boolean {
		validationError = '';

		// Basic URL validation for notebook link if provided
		if (editedTeam.notebookLink.trim() !== '') {
			try {
				new URL(editedTeam.notebookLink.trim());
			} catch {
				validationError = 'Please enter a valid URL for the notebook link';
				return false;
			}
		}

		return true;
	}

	function handleCancel() {
		validationError = '';
		dialogs.closeDialog(false);
	}

	async function handleSave() {
		if (!validateTeam()) {
			return;
		}

		isSaving = true;
		try {
			// Update team data via WRPC client
			await app.wrpcClient.team.updateTeamData.mutation({
				id: team.id,
				notebookLink: editedTeam.notebookLink.trim(),
				notebookDevelopmentStatus: team.notebookDevelopmentStatus,
				absent: editedTeam.absent
			});

			app.addSuccessNotice('Team data updated successfully!');
			validationError = '';
			dialogs.closeDialog(true);
		} catch (error) {
			console.error('Failed to update team data:', error);
			validationError = 'Failed to save team data. Please try again.';
			app.addErrorNotice('Failed to save team data');
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-lg">
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">Edit Team Data: {team.number}</h3>

	<!-- Validation Error Message -->
	{#if validationError}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{validationError}
		</div>
	{/if}

	<div class="space-y-4">
		<!-- Team Info Display -->
		<div class="rounded-lg bg-gray-50 p-3">
			<div class="text-sm font-medium text-gray-900">{team.number} - {team.name}</div>
			<div class="text-sm text-gray-600">{team.school} • {team.grade}</div>
		</div>

		<!-- Notebook Link -->
		<div>
			<label for="team-notebook-link" class="mb-1 block text-sm font-medium text-gray-700">Notebook Link</label>
			<input
				id="team-notebook-link"
				type="url"
				bind:value={editedTeam.notebookLink}
				class="classic block w-full"
				placeholder="https://..."
			/>
			<p class="mt-1 text-xs text-gray-500">Enter the URL to the team's engineering notebook</p>
		</div>

		<!-- Exclude from Judging -->
		<div>
			<label class="flex items-center">
				<input 
					type="checkbox" 
					bind:checked={editedTeam.absent} 
					class="mr-2 rounded border-gray-300 text-red-600 focus:ring-red-500" 
				/>
				<span class="text-sm text-gray-700">Exclude this team from judged awards</span>
			</label>
			<p class="mt-1 text-xs text-gray-500">If checked, this team will not be considered for judged awards</p>
		</div>
	</div>

	<div class="mt-6 flex justify-end space-x-3">
		<button onclick={handleCancel} class="cancel" disabled={isSaving}>Cancel</button>
		<button onclick={handleSave} class="primary" disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Changes'}
		</button>
	</div>
</Dialog>