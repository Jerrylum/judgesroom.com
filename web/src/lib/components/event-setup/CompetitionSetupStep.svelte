<script lang="ts">
	import { getEventGradeLevelOptions } from '$lib/event.svelte';
	import { type CompetitionType, CompetitionTypeSchema } from '@judging.jerryio/protocol/src/award';
	import type { EventGradeLevel } from '@judging.jerryio/protocol/src/event';

	interface Props {
		eventName: string;
		selectedCompetitionType: CompetitionType;
		selectedEventGradeLevel: EventGradeLevel;
		onNext: () => void;
	}

	let { eventName = $bindable(), selectedCompetitionType = $bindable(), selectedEventGradeLevel = $bindable(), onNext }: Props = $props();

	// Computed grade options based on competition type
	const gradeOptions = $derived(getEventGradeLevelOptions(selectedCompetitionType));

	// Validation
	const isEventNameValid = $derived(eventName.trim().length > 0);
	const hasLeadingTrailingWhitespace = $derived(eventName.length > 0 && eventName !== eventName.trim());
	const isEventNameTooLong = $derived(eventName.length > 100);

	const canProceed = $derived(isEventNameValid && !hasLeadingTrailingWhitespace && !isEventNameTooLong);

	function handleNext() {
		if (canProceed) {
			onNext();
		}
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">Competition Information</h2>

	<div>
		<label for="event-name" class="mb-2 block text-sm font-medium text-gray-700"> Event Name </label>
		<input
			type="text"
			id="event-name"
			bind:value={eventName}
			maxlength="100"
			class="classic block w-full"
			class:border-red-500={!isEventNameValid || hasLeadingTrailingWhitespace || isEventNameTooLong}
			class:focus:ring-red-500={!isEventNameValid || hasLeadingTrailingWhitespace || isEventNameTooLong}
			placeholder="Enter event name"
		/>
		{#if !isEventNameValid}
			<p class="mt-1 text-sm text-red-600">Event name is required</p>
		{:else if hasLeadingTrailingWhitespace}
			<p class="mt-1 text-sm text-red-600">Event name must not have leading or trailing whitespace</p>
		{:else if isEventNameTooLong}
			<p class="mt-1 text-sm text-red-600">Event name must be 100 characters or less</p>
		{/if}
	</div>

	<div>
		<label for="competition-type" class="mb-2 block text-sm font-medium text-gray-700"> Competition Type </label>
		<select id="competition-type" bind:value={selectedCompetitionType} class="classic block w-full">
			{#each CompetitionTypeSchema.options as type (type)}
				<option value={type}>{type}</option>
			{/each}
		</select>
	</div>

	<div>
		<label for="grade-level" class="mb-2 block text-sm font-medium text-gray-700"> Grade Level </label>
		<select id="grade-level" bind:value={selectedEventGradeLevel} class="classic block w-full">
			{#each gradeOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	<div class="flex justify-end pt-4">
		<button
			onclick={handleNext}
			class="primary"
			class:opacity-50={!canProceed}
			class:cursor-not-allowed={!canProceed}
			disabled={!canProceed}
		>
			Next: Award Selection
		</button>
	</div>
</div>
