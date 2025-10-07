<script lang="ts">
	import { dialogs } from '$lib/app-page.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import type { EditingTeam } from '$lib/team.svelte';
	import { GradeSchema } from '@judging.jerryio/protocol/src/award';

	interface Props {
		team: EditingTeam;
	}

	let { team }: Props = $props();

	// Clone the team data for editing
	let editedTeam = $state({
		number: team.number,
		name: team.name,
		school: team.school,
		grade: team.grade,
		notebookLink: team.notebookLink,
		excluded: team.excluded,
		city: team.city,
		state: team.state,
		country: team.country,
		shortName: team.shortName,
		group: team.group
	});

	// Validation states
	let validationError = $state('');

	// Validation function
	function validateTeam(): boolean {
		validationError = '';

		// No validation needed for team number since it's disabled/not editable

		return true;
	}

	function handleCancel() {
		validationError = '';
		dialogs.closeDialog(false);
	}

	function handleSave() {
		if (!validateTeam()) {
			return;
		}

		// Apply changes to the original team
		team.name = editedTeam.name;
		team.school = editedTeam.school;
		team.grade = editedTeam.grade;
		team.notebookLink = editedTeam.notebookLink;
		team.excluded = editedTeam.excluded;
		team.city = editedTeam.city;
		team.state = editedTeam.state;
		team.country = editedTeam.country;
		team.shortName = editedTeam.shortName;
		team.group = editedTeam.group;

		validationError = '';
		dialogs.closeDialog(true);
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-2xl">
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">Edit Team: {team.number}</h3>

	<!-- Validation Error Message -->
	{#if validationError}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{validationError}
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<label for="team-number" class="mb-1 block text-sm font-medium text-gray-700">Team Number</label>
			<input id="team-number" type="text" value={editedTeam.number} disabled class="classic block w-full" />
		</div>

		<div>
			<label for="team-name" class="mb-1 block text-sm font-medium text-gray-700">Team Name</label>
			<input id="team-name" type="text" bind:value={editedTeam.name} class="classic block w-full" />
		</div>

		<div>
			<label for="team-school" class="mb-1 block text-sm font-medium text-gray-700">School</label>
			<input id="team-school" type="text" bind:value={editedTeam.school} class="classic block w-full" />
		</div>

		<div>
			<label for="team-grade" class="mb-1 block text-sm font-medium text-gray-700">Grade</label>
			<select id="team-grade" bind:value={editedTeam.grade} class="classic block w-full">
				{#each GradeSchema.options as grade (grade)}
					<option value={grade}>{grade}</option>
				{/each}
			</select>
		</div>

		<div class="md:col-span-2">
			<label for="team-notebook-link" class="mb-1 block text-sm font-medium text-gray-700">Notebook Link</label>
			<input
				id="team-notebook-link"
				type="url"
				bind:value={editedTeam.notebookLink}
				class="classic block w-full"
				placeholder="https://..."
			/>
		</div>

		<div class="md:col-span-2">
			<label class="flex items-center">
				<input type="checkbox" bind:checked={editedTeam.excluded} class="mr-2 rounded border-gray-300 text-red-600 focus:ring-red-500" />
				<span class="text-sm text-gray-700">Exclude this team from judged awards</span>
			</label>
		</div>
	</div>

	<div class="mt-6 flex justify-end space-x-3">
		<button onclick={handleCancel} class="cancel">Cancel</button>
		<button onclick={handleSave} class="primary">Save Changes</button>
	</div>
</Dialog>
