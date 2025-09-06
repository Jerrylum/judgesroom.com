<script lang="ts">
	import TeamGroup from './TeamGroup.svelte';
	import EditTeamDialog from './EditTeamDialog.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import { Team, TeamList, groupTeamsByGroup, parseTournamentManagerCSV, parseNotebookData, mergeTeamData } from '$lib/team.svelte';

	interface Props {
		teams: Team[];
	}

	let { teams = $bindable() }: Props = $props();

	// Upload states
	let csvContent = $state('');
	let notebookContent = $state('');
	let isDragOver = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');

	// Team management states
	let teamGroups = $state<Record<string, Team[]>>(groupTeamsByGroup(teams));
	let newGroupName = $state('');

	// Multi-select drag and drop states
	let selectedItems = $state(new TeamList());
	let activeZoneId = $state('');

	const allTeamsHaveSameGrade = $derived(teams.every((team) => team.grade === teams[0].grade));

	// File input reference
	let fileInput: HTMLInputElement;

	// Automatically update teams array when teamGroups changes
	$effect(() => {
		Object.entries(teamGroups).forEach(([groupName, teamList]) => {
			teamList.forEach((team) => {
				team.group = groupName;
			});
		});
	});

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

	function processTeamData() {
		if (!csvContent.trim()) {
			uploadError = 'Please upload a CSV file first';
			return;
		}

		try {
			const csvTeams = parseTournamentManagerCSV(csvContent);
			const notebookLinks = notebookContent.trim() ? parseNotebookData(notebookContent) : {};

			const mergedTeams = mergeTeamData(csvTeams, notebookLinks);
			teams = mergedTeams;
			teamGroups = groupTeamsByGroup(mergedTeams);

			uploadSuccess = `Successfully imported ${mergedTeams.length} teams`;
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

	function createNewGroup() {
		const trimmedName = newGroupName.trim();
		const hasLeadingTrailingWhitespace = newGroupName.length > 0 && newGroupName !== newGroupName.trim();

		if (trimmedName && !hasLeadingTrailingWhitespace && trimmedName.length <= 100 && !teamGroups[trimmedName]) {
			teamGroups[trimmedName] = [];
			newGroupName = '';
		}
	}

	function handleRenameGroup(oldName: string, newName: string): boolean {
		if (teamGroups[oldName] && !teamGroups[newName]) {
			teamGroups[newName] = teamGroups[oldName];
			delete teamGroups[oldName];
			teamGroups = { ...teamGroups };
			return true;
		}
		return false;
	}

	function handleDeleteGroup(groupName: string) {
		delete teamGroups[groupName];
		teamGroups = { ...teamGroups };
	}

	async function editTeam(team: Team) {
		const saved = await dialogs.showCustom(EditTeamDialog, {
			props: { team },
			maxWidth: 'max-w-2xl'
		});

		// Note: saved will be true if user clicked Save, false if cancelled
		// The team data is already modified by reference in the dialog component
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">Team Import</h2>

	<!-- File Upload Section -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- CSV Upload -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-gray-800">1. Tournament Manager Data</h3>
			<p class="h-14 text-sm text-gray-600">
				Download CSV from RobotEvents → Event Admin → "Downloads & Links" → "Download Tournament Manager Import Data"
			</p>

			<div
				class="flex h-40 flex-col justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors"
				class:border-blue-400={isDragOver}
				class:bg-blue-50={isDragOver}
				class:border-gray-300={!isDragOver}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleFileDrop}
				role="none"
				tabindex="-1"
			>
				<div class="">
					<svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
						<path
							d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<div>
						<button
							aria-label="Upload CSV file"
							aria-roledescription="Upload CSV file"
							onclick={() => fileInput.click()}
							class="cursor-pointer font-medium text-blue-600 hover:text-blue-500"
						>
							Click to upload
						</button>
						<span class="text-gray-500"> or drag and drop</span>
					</div>
					<p class="text-xs text-gray-500">CSV files only</p>
				</div>
			</div>

			<input bind:this={fileInput} type="file" accept=".csv" onchange={handleFileSelect} class="hidden" />

			{#if csvContent}
				<div class="rounded bg-green-50 p-2 text-sm text-green-600">✓ CSV file loaded</div>
			{/if}
		</div>

		<!-- Notebook Data -->
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-gray-800">2. Digital Engineering Notebooks (Optional)</h3>
			<p class="h-14 text-sm text-gray-600">
				Download the Excel file from RobotEvents → Event Admin → "Downloads & Links" → "Download Digital Engineering Notebook Links report".
				Select all data in the Excel file (Ctrl+A) and paste it here
			</p>

			<div class="mb-4 h-40 w-full">
				<textarea
					bind:value={notebookContent}
					placeholder="Paste notebook data here (tab-separated)..."
					class="h-40 w-full resize-none rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500"
				></textarea>
			</div>

			{#if notebookContent}
				<div class="rounded bg-blue-50 p-2 text-sm text-blue-600">✓ Notebook data loaded</div>
			{/if}
		</div>
	</div>

	<!-- Process Button -->
	<div class="flex justify-center">
		<button onclick={processTeamData} disabled={!csvContent.trim()} class="primary"> Import Teams </button>
	</div>

	<!-- Status Messages -->
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

	<!-- Team Management -->
	{#if teams.length > 0}
		<div class="space-y-6 border-t pt-6">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-800">Team Groups</h3>
				<div class="flex items-center gap-2">
					<input type="text" bind:value={newGroupName} placeholder="New group name" maxlength="100" class="classic" />
					<button onclick={createNewGroup} disabled={!newGroupName.trim()} class="primary tiny"> Create Group </button>
				</div>
			</div>

			<p class="h-7 text-sm text-gray-600">
				Drag and drop teams between groups to organize them. Right click to select multiple teams. Team groups are useful when determining
				the final ranking of award winners.
			</p>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
				{#each Object.keys(teamGroups) as groupName (groupName)}
					<TeamGroup
						{groupName}
						bind:teamList={teamGroups[groupName]}
						bind:selectedItems
						bind:activeZoneId
						onEditTeam={editTeam}
						onRenameGroup={handleRenameGroup}
						onDeleteGroup={handleDeleteGroup}
						showGrade={!allTeamsHaveSameGrade}
					/>
				{/each}
			</div>

			<!-- Summary -->
			<div class="rounded-lg bg-blue-50 p-4">
				<h4 class="mb-2 font-medium text-blue-900">Import Summary</h4>
				<div class="space-y-1 text-sm text-blue-800">
					<p>Total Teams: {teams.length}</p>
					<p>Active Teams: {teams.filter((t) => !t.excluded).length}</p>
					<p>Excluded Teams: {teams.filter((t) => t.excluded).length}</p>
					<p>Teams with Notebooks: {teams.filter((t) => t.notebookLink).length}</p>
					<p>Groups: {Object.keys(teamGroups).length}</p>
				</div>
			</div>
		</div>
	{/if}
</div>
