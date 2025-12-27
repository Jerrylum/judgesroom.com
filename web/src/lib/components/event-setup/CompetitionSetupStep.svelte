<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getEventGradeLevelOptions } from '$lib/event.svelte';
	import { type Program, ProgramSchema } from '@judgesroom.com/protocol/src/award';
	import type { EventGradeLevel } from '@judgesroom.com/protocol/src/event';
	import { parseTournamentManagerCSV, type TeamInfoAndData } from '$lib/team.svelte';
	import type { AwardOptions } from '$lib/award.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { gtag } from '$lib/index.svelte';

	gtag('event', 'competition_setup_step_loaded');

	interface Props {
		robotEventsEventId: number | null;
		eventName: string;
		selectedProgram: Program;
		selectedEventGradeLevel: EventGradeLevel;
		teams: TeamInfoAndData[];
		awardOptions: AwardOptions[];
		onNext: () => void;
		onPrev: () => void;
	}

	let {
		robotEventsEventId,
		eventName = $bindable(),
		selectedProgram = $bindable(),
		selectedEventGradeLevel = $bindable(),
		teams = $bindable(),
		awardOptions = $bindable(),
		onNext,
		onPrev
	}: Props = $props();

	const originalSelectedEventGradeLevel = selectedEventGradeLevel;
	const originalSelectedProgram = selectedProgram;

	// Computed grade options based on program
	const gradeOptions = $derived(getEventGradeLevelOptions(selectedProgram));

	// Validation
	const isEventNameValid = $derived(eventName.trim().length > 0);
	const hasLeadingTrailingWhitespace = $derived(eventName.length > 0 && eventName !== eventName.trim());
	const isEventNameTooLong = $derived(eventName.length > 100);

	const canProceed = $derived(
		isEventNameValid && !hasLeadingTrailingWhitespace && !isEventNameTooLong && (robotEventsEventId !== null || teams.length > 0) // For unofficial events, teams must be imported
	);

	const isEditable = robotEventsEventId === null;

	// Manual CSV import state (for unofficial events)
	let csvContent = $state('');
	let isDragOver = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');

	// File input reference
	let fileInput: HTMLInputElement | undefined = $state();

	// Manual CSV import functions (for unofficial events)
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			readFile(file);
		}
	}

	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			readFile(files[0]);
		}
	}

	function readFile(file: File) {
		if (!file.name.endsWith('.csv')) {
			uploadSuccess = '';
			uploadError = m.upload_csv_again();
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			csvContent = e.target?.result as string;
			uploadError = '';
			// Automatically process the CSV data
			processManualTeamData();
		};
		reader.onerror = () => {
			uploadError = m.error_reading_file();
		};
		reader.readAsText(file);
	}

	async function processManualTeamData() {
		if (!csvContent.trim()) {
			uploadSuccess = '';
			uploadError = m.upload_csv_first();
			return;
		}

		try {
			const csvTeams = parseTournamentManagerCSV(csvContent);

			// Convert to TeamInfoAndData format
			const newTeams = csvTeams.map((team) => {
				const teamNumber = team.number!;
				// Reuse the id of the existing team if it exists, otherwise generate a new one
				const existingTeam = teams.find((t) => t.number === teamNumber);
				const id = existingTeam?.id ?? uuidv4();

				return {
					id,
					number: teamNumber,
					name: team.name || '',
					city: team.city || '',
					state: team.state || '',
					country: team.country || '',
					shortName: team.shortName || '',
					school: team.school || '',
					grade: team.grade || 'College',
					group: existingTeam?.group ?? team.group ?? '',
					notebookLink: existingTeam?.notebookLink ?? '',
					hasInnovateAwardSubmissionForm: existingTeam?.hasInnovateAwardSubmissionForm ?? false,
					notebookDevelopmentStatus: existingTeam?.notebookDevelopmentStatus ?? 'undetermined',
					absent: existingTeam?.absent ?? false
				} satisfies TeamInfoAndData;
			});

			teams = newTeams;
			uploadSuccess = m.successfully_imported_teams({ count: newTeams.length });
			uploadError = '';
		} catch (error) {
			uploadError = m.error_processing_data({ error: (error as Error).message });
			uploadSuccess = '';
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
	}

	function handleNext() {
		if (canProceed) {
			if (originalSelectedEventGradeLevel !== selectedEventGradeLevel || originalSelectedProgram !== selectedProgram) {
				awardOptions = []; // reset awards, the award options will be re-generated based on the new program and grade level
			}
			onNext();
		}
	}

	// Reset grade level when program changes
	$effect(() => {
		if (!gradeOptions.some((option) => option.value === selectedEventGradeLevel)) {
			selectedEventGradeLevel = gradeOptions[gradeOptions.length - 1].value;
		}
	});
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">{m.competition_setup()}</h2>

	<!-- Event Information -->
	<div class="space-y-4">
		<h3 class="text-lg font-medium text-gray-800">{m.event_information()}</h3>

		<div>
			<label for="event-name" class="mb-2 block text-sm font-medium text-gray-700">{m.event_name()}</label>
			<input
				type="text"
				id="event-name"
				bind:value={eventName}
				maxlength="100"
				class="classic block w-full"
				class:border-red-500={!isEventNameValid || hasLeadingTrailingWhitespace || isEventNameTooLong}
				class:focus:ring-red-500={!isEventNameValid || hasLeadingTrailingWhitespace || isEventNameTooLong}
				placeholder={m.enter_event_name()}
				disabled={!isEditable}
			/>
			{#if !isEventNameValid}
				<p class="mt-1 text-sm text-red-600">{m.event_name_is_required()}</p>
			{:else if hasLeadingTrailingWhitespace}
				<p class="mt-1 text-sm text-red-600">{m.event_name_whitespace_error_message()}</p>
			{:else if isEventNameTooLong}
				<p class="mt-1 text-sm text-red-600">{m.event_name_too_long_error_message()}</p>
			{/if}
		</div>

		<div>
			<label for="competition-type" class="mb-2 block text-sm font-medium text-gray-700">{m.program()}</label>
			<select id="competition-type" bind:value={selectedProgram} class="classic block w-full" disabled={!isEditable}>
				{#each ProgramSchema.options as type (type)}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="grade-level" class="mb-2 block text-sm font-medium text-gray-700">{m.grade_level()}</label>
			<select id="grade-level" bind:value={selectedEventGradeLevel} class="classic block w-full" disabled={!isEditable}>
				{#each gradeOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Manual Import Section (for unofficial events) -->
	{#if isEditable}
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-gray-800">{m.team_import()}</h3>
			<div class="space-y-2">
				<p class="text-sm text-gray-600">{m.team_import_description()}</p>
				<p class="text-sm text-gray-600">
					{m.download_csv_from_robotevents()}
				</p>
				<p class="text-sm text-gray-600">{m.download_csv_from_tournament_manager()}</p>
			</div>

			<div
				class="flex h-32 flex-col justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors"
				class:border-blue-400={isDragOver}
				class:bg-blue-50={isDragOver}
				class:border-gray-300={!isDragOver}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleFileDrop}
				role="none"
				tabindex="-1"
			>
				<div>
					<svg class="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
						<path
							d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<button onclick={() => fileInput?.click()} class="cursor-pointer font-medium text-blue-600 hover:text-blue-500">
						{m.upload_csv()}
					</button>
					<p class="text-xs text-gray-500">{m.or_drag_and_drop()}</p>
				</div>
			</div>

			<input bind:this={fileInput} type="file" accept=".csv" onchange={handleFileSelect} class="hidden" />

			{#if uploadError}
				<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
					{uploadError}
				</div>
			{/if}

			{#if uploadSuccess}
				<div class="rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
					{uploadSuccess}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Team Summary -->
	{#if teams.length > 0}
		<div class="rounded-lg bg-slate-50 p-4">
			<h4 class="mb-2 font-medium text-slate-900">{m.team_summary()}</h4>
			<div class="space-y-1 text-sm text-slate-800">
				<p>{m.total_teams({ count: teams.length })}</p>
			</div>
		</div>
	{/if}

	<div class="flex justify-between pt-4">
		<div class="flex space-x-3">
			<button onclick={onPrev} class="secondary">{m.back()}</button>
		</div>
		<button
			onclick={handleNext}
			class="primary"
			class:opacity-50={!canProceed}
			class:cursor-not-allowed={!canProceed}
			disabled={!canProceed}
		>
			{m.next_team_groups()}
		</button>
	</div>
</div>
