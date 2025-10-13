<script lang="ts">
	import { getEventGradeLevelOptions } from '$lib/event.svelte';
	import { type Program, ProgramSchema } from '@judging.jerryio/protocol/src/award';
	import type { EventGradeLevel } from '@judging.jerryio/protocol/src/event';
	import { getRobotEventsClient, importFromRobotEvents, type DivisionInfo, type RobotEventsImportedData } from '$lib/robotevents-source';
	import { parseTournamentManagerCSV, parseNotebookData, extractGroupFromTeamNumber, type TeamInfoAndData } from '$lib/team.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { dialogs } from '$lib/app-page.svelte';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';
	
	interface Props {
		eventName: string;
		selectedProgram: Program;
		selectedEventGradeLevel: EventGradeLevel;
		teams: TeamInfoAndData[];
		onResetAwards: () => void;
		onNext: () => void;
		onCancel: () => void;
		isJudgesRoomJoined: boolean;
	}

	let {
		eventName = $bindable(),
		selectedProgram = $bindable(),
		selectedEventGradeLevel = $bindable(),
		teams = $bindable(),
		onResetAwards,
		onNext,
		onCancel,
		isJudgesRoomJoined
	}: Props = $props();

	const originalSelectedEventGradeLevel = selectedEventGradeLevel;
	const originalSelectedProgram = selectedProgram;

	// RobotEvents import state
	let robotEventsSku = $state('');
	let isImporting = $state(false);
	let importedData = $state<RobotEventsImportedData | null>(null);
	let selectedDivisionId = $state<number | null>(null);
	let importError = $state('');
	let importSuccess = $state('');

	// Manual CSV import state (fallback)
	let csvContent = $state('');
	let notebookContent = $state('');
	let isDragOver = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');

	// Computed grade options based on program
	const gradeOptions = $derived(getEventGradeLevelOptions(selectedProgram));

	// Validation
	const isEventNameValid = $derived(eventName.trim().length > 0);
	const hasLeadingTrailingWhitespace = $derived(eventName.length > 0 && eventName !== eventName.trim());
	const isEventNameTooLong = $derived(eventName.length > 100);

	const canProceed = $derived(
		isEventNameValid && 
		!hasLeadingTrailingWhitespace && 
		!isEventNameTooLong &&
		teams.length > 0
	);

	// Whether the event info fields should be disabled (after RobotEvents import)
	const isEventInfoLocked = $derived(!!importedData);

	// File input reference
	let fileInput: HTMLInputElement | undefined = $state();

	async function handleRobotEventsImport() {
		if (!robotEventsSku.trim()) {
			importError = 'Please enter a RobotEvents event SKU';
			return;
		}

		isImporting = true;
		importError = '';
		importSuccess = '';

		try {
			const client = getRobotEventsClient();
			const data = await importFromRobotEvents(client, robotEventsSku.trim());
			importedData = data;
			
			// Update event info
			eventName = data.eventName;
			selectedProgram = data.program;
			selectedEventGradeLevel = data.eventGradeLevel;

			// Select first division by default
			if (data.divisionInfos.length > 0) {
				selectedDivisionId = data.divisionInfos[0].id;
			}

			// Import teams from selected division or all teams if no divisions
			updateTeamsFromImportedData(data);

			importSuccess = `Successfully imported event "${data.eventName}" with ${data.teamInfos.length} teams`;
			
			// Reset awards since program/grade level may have changed
			if (originalSelectedEventGradeLevel !== selectedEventGradeLevel || originalSelectedProgram !== selectedProgram) {
				onResetAwards();
			}
		} catch (error) {
			console.error('Error importing from RobotEvents:', error);
			importError = `Failed to import from RobotEvents: ${error instanceof Error ? error.message : 'Unknown error'}`;
		} finally {
			isImporting = false;
		}
	}

	function updateTeamsFromImportedData(data: RobotEventsImportedData) {
		// The teamInfos from RobotEvents import are already in TeamInfoAndData format
		teams = data.teamInfos as TeamInfoAndData[];
	}

	// Handle division selection change
	$effect(() => {
		if (importedData && selectedDivisionId) {
			// TODO: If we need to filter teams by division, implement here
			// For now, we import all teams regardless of division
			updateTeamsFromImportedData(importedData);
		}
	});

	// Manual CSV import functions (fallback for users without RobotEvents access)
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
			uploadError = 'Please upload a CSV file from RobotEvents';
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			csvContent = e.target?.result as string;
			uploadError = '';
			uploadSuccess = 'CSV file uploaded successfully, click "Import Teams" to process the data';
		};
		reader.onerror = () => {
			uploadError = 'Error reading file';
		};
		reader.readAsText(file);
	}

	async function processManualTeamData() {
		if (!csvContent.trim()) {
			uploadError = 'Please upload a CSV file first';
			return;
		}

		try {
			const csvTeams = parseTournamentManagerCSV(csvContent);
			const notebookLinks = notebookContent.trim() ? parseNotebookData(notebookContent) : {};

			// Convert to TeamInfoAndData format
			const newTeams = csvTeams.map((team) => {
				const id = uuidv4();
				const teamNumber = team.number!;
				const notebookLink = notebookLinks[teamNumber] || '';

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
					group: team.group || '',
					notebookLink,
					notebookDevelopmentStatus: 'undetermined' as const,
					absent: false
				} satisfies TeamInfoAndData;
			});

			teams = newTeams;
			uploadSuccess = `Successfully imported ${newTeams.length} teams`;
			uploadError = '';
		} catch (error) {
			console.error('Error processing data', error);
			uploadError = `Error processing data: ${error}`;
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
				onResetAwards();
			}
			onNext();
		}
	}

	function clearImportedData() {
		importedData = null;
		selectedDivisionId = null;
		teams = [];
		importSuccess = '';
		importError = '';
	}

	// Reset grade level when program changes
	$effect(() => {
		if (!gradeOptions.some((option) => option.value === selectedEventGradeLevel)) {
			selectedEventGradeLevel = gradeOptions[gradeOptions.length - 1].value;
		}
	});
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">Competition Setup</h2>

	<!-- RobotEvents Import Section -->
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<h3 class="text-lg font-medium text-gray-800">Import from RobotEvents</h3>
		<p class="text-sm text-gray-600">
			Enter your event SKU to automatically import event details and team information from RobotEvents.
		</p>

		<div class="flex gap-3">
			<div class="flex-1">
				<label for="robotevents-sku" class="mb-2 block text-sm font-medium text-gray-700">Event SKU</label>
				<input
					type="text"
					id="robotevents-sku"
					bind:value={robotEventsSku}
					disabled={isImporting}
					class="classic block w-full"
					placeholder="e.g., RE-VRC-23-4321"
				/>
			</div>
			<div class="flex items-end">
				<button
					onclick={handleRobotEventsImport}
					disabled={isImporting || !robotEventsSku.trim()}
					class="primary flex items-center gap-2"
					class:opacity-50={isImporting || !robotEventsSku.trim()}
				>
					{#if isImporting}
						<RefreshIcon class="h-4 w-4 animate-spin" />
						Importing...
					{:else}
						Import Event
					{/if}
				</button>
			</div>
		</div>

		{#if importError}
			<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				{importError}
			</div>
		{/if}

		{#if importSuccess}
			<div class="rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
				{importSuccess}
				{#if importedData}
					<button
						onclick={clearImportedData}
						class="ml-2 text-sm underline hover:no-underline"
					>
						Clear import
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Event Information -->
	<div class="space-y-4">
		<h3 class="text-lg font-medium text-gray-800">Event Information</h3>

		<div>
			<label for="event-name" class="mb-2 block text-sm font-medium text-gray-700">Event Name</label>
			<input
				type="text"
				id="event-name"
				bind:value={eventName}
				disabled={isEventInfoLocked}
				maxlength="100"
				class="classic block w-full"
				class:border-red-500={!isEventNameValid || hasLeadingTrailingWhitespace || isEventNameTooLong}
				class:focus:ring-red-500={!isEventNameValid || hasLeadingTrailingWhitespace || isEventNameTooLong}
				class:bg-gray-100={isEventInfoLocked}
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
			<label for="competition-type" class="mb-2 block text-sm font-medium text-gray-700">Program</label>
			<select
				id="competition-type"
				bind:value={selectedProgram}
				disabled={isEventInfoLocked}
				class="classic block w-full"
				class:bg-gray-100={isEventInfoLocked}
			>
				{#each ProgramSchema.options as type (type)}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="grade-level" class="mb-2 block text-sm font-medium text-gray-700">Grade Level</label>
			<select
				id="grade-level"
				bind:value={selectedEventGradeLevel}
				disabled={isEventInfoLocked}
				class="classic block w-full"
				class:bg-gray-100={isEventInfoLocked}
			>
				{#each gradeOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<!-- Division Selection (only show if imported from RobotEvents) -->
		{#if importedData && importedData.divisionInfos.length > 1}
			<div>
				<label for="division" class="mb-2 block text-sm font-medium text-gray-700">Division</label>
				<select
					id="division"
					bind:value={selectedDivisionId}
					class="classic block w-full"
				>
					{#each importedData.divisionInfos as division (division.id)}
						<option value={division.id}>{division.name}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<!-- Manual Import Section (fallback) -->
	{#if !importedData}
		<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
			<h3 class="text-lg font-medium text-gray-800">Manual Team Import</h3>
			<p class="text-sm text-gray-600">
				If you don't have access to RobotEvents, you can manually import teams using CSV files.
			</p>

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- CSV Upload -->
				<div class="space-y-4">
					<h4 class="text-base font-medium text-gray-800">Tournament Manager Data</h4>
					<p class="text-sm text-gray-600">
						Download CSV from RobotEvents → Event Admin → "Downloads & Links" → "Download Tournament Manager Import Data"
					</p>

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
							<button
								onclick={() => fileInput?.click()}
								class="cursor-pointer font-medium text-blue-600 hover:text-blue-500"
							>
								Upload CSV
							</button>
							<p class="text-xs text-gray-500">or drag and drop</p>
						</div>
					</div>

					<input bind:this={fileInput} type="file" accept=".csv" onchange={handleFileSelect} class="hidden" />

					{#if csvContent}
						<div class="rounded bg-green-50 p-2 text-sm text-green-600">✓ CSV file loaded</div>
					{/if}
				</div>

				<!-- Notebook Data -->
				<div class="space-y-4">
					<h4 class="text-base font-medium text-gray-800">Digital Engineering Notebooks (Optional)</h4>
					<p class="text-sm text-gray-600">
						Download Excel file from RobotEvents and paste the data here.
					</p>

					<textarea
						bind:value={notebookContent}
						placeholder="Paste notebook data here (tab-separated)..."
						class="h-32 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
					></textarea>

					{#if notebookContent}
						<div class="rounded bg-blue-50 p-2 text-sm text-blue-600">✓ Notebook data loaded</div>
					{/if}
				</div>
			</div>

			<div class="flex justify-center">
				<button onclick={processManualTeamData} disabled={!csvContent.trim()} class="primary">
					Import Teams
				</button>
			</div>

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
			<h4 class="mb-2 font-medium text-slate-900">Team Summary</h4>
			<div class="space-y-1 text-sm text-slate-800">
				<p>Total Teams: {teams.length}</p>
			</div>
		</div>
	{/if}

	<div class="flex justify-between pt-4">
		<div class="flex space-x-3">
			{#if isJudgesRoomJoined}
				<button onclick={onCancel} class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					Cancel
				</button>
			{/if}
		</div>
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
