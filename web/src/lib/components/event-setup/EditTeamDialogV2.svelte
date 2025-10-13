<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import { ProgramSchema, type Grade } from '@judging.jerryio/protocol/src/award';
	import { dialogs } from '$lib/app-page.svelte';

	interface Props {
		team: TeamInfoAndData;
	}

	let { team }: Props = $props();

	const dispatch = createEventDispatcher<{ close: TeamInfoAndData | null }>();

	// Create a working copy of the team
	let editedTeam = $state({ ...team });
	let validationErrors = $state<Record<string, string>>({});

	// Validation
	const isTeamNumberValid = $derived(editedTeam.number.trim().length > 0);
	const isTeamNameValid = $derived(editedTeam.name.trim().length > 0);
	const hasLeadingTrailingWhitespace = $derived(
		editedTeam.name.length > 0 && editedTeam.name !== editedTeam.name.trim()
	);
	const isTeamNameTooLong = $derived(editedTeam.name.length > 100);

	const canSave = $derived(
		isTeamNumberValid &&
		isTeamNameValid &&
		!hasLeadingTrailingWhitespace &&
		!isTeamNameTooLong
	);

	function handleSave() {
		if (canSave) {
			dispatch('close', editedTeam);
		}
	}

	function handleCancel() {
		dispatch('close', null);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && canSave) {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			handleCancel();
		}
	}

	// Grade options
	const gradeOptions: Grade[] = ['Elementary School', 'Middle School', 'High School', 'College'];

	// Notebook development status options
	const notebookStatusOptions = [
		{ value: 'undetermined', label: 'Undetermined' },
		{ value: 'not_submitted', label: 'Not Submitted' },
		{ value: 'developing', label: 'Developing' },
		{ value: 'fully_developed', label: 'Fully Developed' }
	];
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onclick={handleCancel} onkeydown={(e) => e.key === 'Escape' && handleCancel()} role="button" tabindex="-1">
	<div
		class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
		onclick={(e) => e.stopPropagation()}
		onkeydown={handleKeydown}
		role="dialog"
		aria-labelledby="edit-team-title"
		tabindex="0"
	>
		<h2 id="edit-team-title" class="mb-6 text-xl font-semibold text-gray-900">Edit Team</h2>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Team Number -->
			<div>
				<label for="team-number" class="mb-2 block text-sm font-medium text-gray-700">Team Number</label>
				<input
					type="text"
					id="team-number"
					bind:value={editedTeam.number}
					disabled
					class="classic block w-full bg-gray-100"
					placeholder="Team number"
				/>
				<p class="mt-1 text-xs text-gray-500">Team number cannot be changed</p>
			</div>

			<!-- Team Name -->
			<div>
				<label for="team-name" class="mb-2 block text-sm font-medium text-gray-700">Team Name</label>
				<input
					type="text"
					id="team-name"
					bind:value={editedTeam.name}
					maxlength="100"
					class="classic block w-full"
					class:border-red-500={!isTeamNameValid || hasLeadingTrailingWhitespace || isTeamNameTooLong}
					class:focus:ring-red-500={!isTeamNameValid || hasLeadingTrailingWhitespace || isTeamNameTooLong}
					placeholder="Team name"
				/>
				{#if !isTeamNameValid}
					<p class="mt-1 text-sm text-red-600">Team name is required</p>
				{:else if hasLeadingTrailingWhitespace}
					<p class="mt-1 text-sm text-red-600">Team name must not have leading or trailing whitespace</p>
				{:else if isTeamNameTooLong}
					<p class="mt-1 text-sm text-red-600">Team name must be 100 characters or less</p>
				{/if}
			</div>

			<!-- School -->
			<div>
				<label for="school" class="mb-2 block text-sm font-medium text-gray-700">School</label>
				<input
					type="text"
					id="school"
					bind:value={editedTeam.school}
					class="classic block w-full"
					placeholder="School name"
				/>
			</div>

			<!-- Grade -->
			<div>
				<label for="grade" class="mb-2 block text-sm font-medium text-gray-700">Grade</label>
				<select id="grade" bind:value={editedTeam.grade} class="classic block w-full">
					{#each gradeOptions as grade}
						<option value={grade}>{grade}</option>
					{/each}
				</select>
			</div>

			<!-- City -->
			<div>
				<label for="city" class="mb-2 block text-sm font-medium text-gray-700">City</label>
				<input
					type="text"
					id="city"
					bind:value={editedTeam.city}
					class="classic block w-full"
					placeholder="City"
				/>
			</div>

			<!-- State -->
			<div>
				<label for="state" class="mb-2 block text-sm font-medium text-gray-700">State/Province</label>
				<input
					type="text"
					id="state"
					bind:value={editedTeam.state}
					class="classic block w-full"
					placeholder="State or Province"
				/>
			</div>

			<!-- Country -->
			<div class="md:col-span-2">
				<label for="country" class="mb-2 block text-sm font-medium text-gray-700">Country</label>
				<input
					type="text"
					id="country"
					bind:value={editedTeam.country}
					class="classic block w-full"
					placeholder="Country"
				/>
			</div>

			<!-- Notebook Link -->
			<div class="md:col-span-2">
				<label for="notebook-link" class="mb-2 block text-sm font-medium text-gray-700">Notebook Link</label>
				<input
					type="url"
					id="notebook-link"
					bind:value={editedTeam.notebookLink}
					class="classic block w-full"
					placeholder="https://example.com/notebook"
				/>
			</div>

			<!-- Notebook Development Status -->
			<div>
				<label for="notebook-status" class="mb-2 block text-sm font-medium text-gray-700">Notebook Status</label>
				<select id="notebook-status" bind:value={editedTeam.notebookDevelopmentStatus} class="classic block w-full">
					{#each notebookStatusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Absent -->
			<div class="flex items-center">
				<input
					type="checkbox"
					id="absent"
					bind:checked={editedTeam.absent}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="absent" class="ml-2 text-sm font-medium text-gray-700">Team is absent</label>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="mt-6 flex justify-end gap-3">
			<button onclick={handleCancel} class="secondary">Cancel</button>
			<button
				onclick={handleSave}
				disabled={!canSave}
				class="primary"
				class:opacity-50={!canSave}
				class:cursor-not-allowed={!canSave}
			>
				Save Changes
			</button>
		</div>
	</div>
</div>
