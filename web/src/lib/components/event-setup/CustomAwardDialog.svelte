<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { dialogs } from '$lib/index.svelte';
	import { AwardOptions, createCustomAwardOptions } from '$lib/award.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { type Program, type Grade, type AwardType, AwardTypeSchema } from '@judgesroom.com/protocol/src/award';

	interface Props {
		existingAwards: AwardOptions[];
		selectedProgram: Program;
		possibleGrades: Grade[];
	}

	let { existingAwards, selectedProgram, possibleGrades }: Props = $props();

	// Custom award form
	let customAwardName = $state('');
	let customAwardType: AwardType = $state('judged');
	let customAwardGrades: Grade[] = $state([]);
	let customAwardWinners = $state(1);
	let customAwardRequireNotebook = $state(false);
	let customAwardRequireTeamInterview = $state(false);
	let customAwardError = $state('');
	let hasUserInteracted = $state(false);
	let customAwardNameInput: HTMLInputElement | null = $state(null);

	// Auto-focus the award name input when dialog mounts
	$effect(() => {
		if (customAwardNameInput) {
			// Use setTimeout to ensure the DOM is fully rendered
			setTimeout(() => {
				customAwardNameInput?.focus();
			}, 0);
		}
	});

	// Initialize form when dialog mounts
	$effect(() => {
		customAwardName = '';
		customAwardType = 'judged';
		customAwardGrades = [...possibleGrades]; // Pre-select possible grades
		customAwardWinners = 1;
		customAwardRequireNotebook = false;
		customAwardRequireTeamInterview = false;
		customAwardError = '';
		hasUserInteracted = false;
	});

	// Validate custom award form (pure function, no state mutation)
	function canSubmitCustomAward() {
		const hasName = customAwardName.trim().length > 0;
		const hasUniqueName = !existingAwards.some((award) => award.name === customAwardName);
		const hasLeadingTrailingWhitespace = customAwardName.length > 0 && customAwardName !== customAwardName.trim();
		const isNameTooLong = customAwardName.trim().length > 100;
		const hasValidWinners = customAwardWinners > 0 && customAwardWinners <= 10000;
		const hasGrades = customAwardGrades.length > 0;

		return hasName && hasUniqueName && !hasLeadingTrailingWhitespace && !isNameTooLong && hasValidWinners && hasGrades;
	}

	// Update error message reactively (only after user interaction)
	$effect(() => {
		if (!hasUserInteracted) {
			customAwardError = '';
			return;
		}

		const hasName = customAwardName.trim().length > 0;
		const hasUniqueName = !existingAwards.some((award) => award.name === customAwardName);
		const hasLeadingTrailingWhitespace = customAwardName.length > 0 && customAwardName !== customAwardName.trim();
		const isNameTooLong = customAwardName.trim().length > 100;
		const hasGrades = customAwardGrades.length > 0;

		if (!hasName) {
			customAwardError = m.award_name_is_required();
		} else if (hasLeadingTrailingWhitespace) {
			customAwardError = m.award_name_whitespace_error_message();
		} else if (isNameTooLong) {
			customAwardError = m.award_name_too_long_error_message();
		} else if (!hasUniqueName) {
			customAwardError = m.award_name_unique_error_message();
		} else if (!hasGrades) {
			customAwardError = m.at_least_one_grade_level_must_be_selected();
		} else if (customAwardWinners <= 0) {
			customAwardError = m.number_of_winners_must_be_greater_than_0();
		} else if (customAwardWinners > 10000) {
			customAwardError = m.number_of_winners_must_be_10000_or_less();
		} else {
			customAwardError = '';
		}
	});

	function handleCancel() {
		dialogs.closeDialog(null);
	}

	// Add custom award
	function addCustomAward() {
		if (canSubmitCustomAward()) {
			const customAward = createCustomAwardOptions(
				customAwardName,
				selectedProgram,
				customAwardType,
				customAwardGrades,
				customAwardWinners,
				customAwardRequireNotebook,
				customAwardRequireTeamInterview
			);

			dialogs.closeDialog(customAward);
		}
	}

	function toggleGradeSelection(grade: Grade) {
		hasUserInteracted = true;
		if (customAwardGrades.includes(grade)) {
			customAwardGrades = customAwardGrades.filter((g) => g !== grade);
		} else {
			customAwardGrades = [...customAwardGrades, grade];
		}
	}
</script>

<Dialog open={true} onClose={handleCancel}>
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">{m.add_custom_award_text()}</h3>

	{#if customAwardError}
		<div class="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
			{customAwardError}
		</div>
	{/if}

	<div class="space-y-4">
		<div>
			<label for="custom-award-name" class="mb-2 block text-sm font-medium text-gray-700">{m.award_name()}</label>
			<input
				id="custom-award-name"
				type="text"
				bind:value={customAwardName}
				bind:this={customAwardNameInput}
				oninput={() => (hasUserInteracted = true)}
				maxlength="100"
				class="classic block w-full"
				placeholder="Enter award name"
			/>
		</div>

		<div>
			<label for="custom-award-type" class="mb-2 block text-sm font-medium text-gray-700">{m.award_type()}</label>
			<select id="custom-award-type" bind:value={customAwardType} onchange={() => (hasUserInteracted = true)} class="classic block w-full">
				{#each AwardTypeSchema.options as type (type)}
					<option value={type}>{type.replace('_', ' ')}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={customAwardRequireNotebook}
					onchange={() => (hasUserInteracted = true)}
					class="mr-3 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
				/>
				<span class="text-sm font-medium text-gray-700">{m.require_notebook()}</span>
			</label>
			<p class="mt-1 text-xs text-gray-500">{m.require_notebook_option_description()}</p>
		</div>

		<div>
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={customAwardRequireTeamInterview}
					onchange={() => (hasUserInteracted = true)}
					class="mr-3 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
				/>
				<span class="text-sm font-medium text-gray-700">{m.require_team_interview()}</span>
			</label>
			<p class="mt-1 text-xs text-gray-500">{m.require_team_interview_option_description()}</p>
		</div>

		<fieldset>
			<legend class="mb-2 block text-sm font-medium text-gray-700">{m.accepted_grades()}</legend>
			<div class="space-y-2 overflow-y-auto">
				{#each possibleGrades as grade (grade)}
					<label class="flex items-center py-1">
						<input
							type="checkbox"
							checked={customAwardGrades.includes(grade)}
							onchange={() => toggleGradeSelection(grade)}
							class="mr-3 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
						/>
						<span class="text-sm text-gray-700">{grade}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<div>
			<label for="custom-award-winners" class="mb-2 block text-sm font-medium text-gray-700">{m.number_of_winners_text()}</label>
			<input
				id="custom-award-winners"
				type="number"
				bind:value={customAwardWinners}
				oninput={() => (hasUserInteracted = true)}
				min="1"
				max="10000"
				class="classic block w-full"
			/>
		</div>
	</div>

	<div class="mt-6 flex justify-end space-x-3">
		<button onclick={handleCancel} class="cancel tiny">{m.cancel()}</button>
		<button
			onclick={addCustomAward}
			disabled={!canSubmitCustomAward()}
			class="primary tiny"
			class:bg-slate-900={canSubmitCustomAward()}
			class:hover:bg-slate-800={canSubmitCustomAward()}
			class:bg-gray-400={!canSubmitCustomAward()}
			class:cursor-not-allowed={!canSubmitCustomAward()}
		>
			Add Award
		</button>
	</div>
</Dialog>
