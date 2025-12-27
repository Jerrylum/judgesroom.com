<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { AppUI, dialogs, gtag } from '$lib/index.svelte';
	import type { AwardOptions } from '$lib/award.svelte';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';
	import {
		getEventDivisionRankings,
		getRobotEventsClient,
		importFromRobotEvents,
		type RobotEventsImportedData
	} from '$lib/robotevents-source';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { Program } from '@judgesroom.com/protocol/src/award';
	import { RobotEventsSkuSchema, type EventGradeLevel } from '@judgesroom.com/protocol/src/event';
	import { untrack } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import RobotEventsImportDialog, { type ImportChoice } from './RobotEventsImportDialog.svelte';

	gtag('event', 'event_code_setup_loaded');

	interface Props {
		isEditingEventSetup: boolean;
		robotEventsSku: string | null;
		robotEventsEventId: number | null;
		divisionId: number | null;
		eventName: string;
		selectedProgram: Program;
		selectedEventGradeLevel: EventGradeLevel;
		teams: TeamInfoAndData[];
		awardOptions: AwardOptions[];
		onNext: () => void;
		onCancel: () => void;
	}

	let {
		isEditingEventSetup,
		robotEventsSku = $bindable(),
		robotEventsEventId = $bindable(),
		divisionId = $bindable(),
		eventName = $bindable(),
		selectedProgram = $bindable(),
		selectedEventGradeLevel = $bindable(),
		teams = $bindable(),
		awardOptions = $bindable(),
		onNext,
		onCancel
	}: Props = $props();

	let importMethod = $state<'robotevents' | 'manual'>(
		isEditingEventSetup ? (robotEventsSku && robotEventsEventId && divisionId ? 'robotevents' : 'manual') : 'robotevents'
	);
	let inputRobotEventsSku = $state(robotEventsSku);
	let inputDivisionId = $state(divisionId);
	let isImporting = $state(false);
	let importedData = $state<RobotEventsImportedData | null>(null);
	let importChoice = $state<ImportChoice>(null);

	const canProceed = $derived(importMethod === 'manual' || importedData || (robotEventsSku && robotEventsEventId && divisionId));

	async function handleRobotEventsImport() {
		gtag('event', 'import_event_from_robotevents', { isEditingEventSetup });

		if (isEditingEventSetup) {
			importChoice = (await dialogs.showCustom(RobotEventsImportDialog, {
				props: {}
			})) as ImportChoice;

			if (!importChoice) {
				return;
			}
		}

		const searching = RobotEventsSkuSchema.parse(inputRobotEventsSku);

		isImporting = true;

		try {
			const client = getRobotEventsClient();
			const data = await importFromRobotEvents(client, searching.trim());

			// Select first division by default
			if (data.divisionInfos.length < 1) {
				gtag('event', 'no_divisions_found_in_robotevents', { isEditingEventSetup });

				importedData = null;
				dialogs.showConfirmation({
					title: m.no_divisions_found_in_robotevents(),
					message: m.no_divisions_found_in_robotevents_message(),
					confirmText: 'OK',
					cancelButtonClass: 'hidden'
				});
				return;
			}
			robotEventsSku = data.robotEventsSku;
			robotEventsEventId = data.robotEventsEventId;

			// Update event info
			eventName = data.eventName;
			selectedProgram = data.program;
			selectedEventGradeLevel = data.eventGradeLevel;

			// Only update award options if user chose full setup, or if not editing
			if (!isEditingEventSetup || importChoice === 'full') {
				awardOptions = data.awardOptions;
			}

			inputRobotEventsSku = data.robotEventsSku;
			inputDivisionId = data.divisionInfos[0].id;
			importedData = data;

			gtag('event', 'successfully_imported_event', {
				isEditingEventSetup,
				awardCount: data.awardOptions.length,
				teamCount: data.teamInfos.length
			});

			dialogs.showConfirmation({
				title: m.successfully_imported_event(),
				message: m.successfully_imported_event_message({ eventName: data.eventName }),
				confirmText: 'OK',
				cancelButtonClass: 'hidden'
			});
		} catch (error) {
			console.error('Error importing from RobotEvents:', error);
			gtag('event', 'error_importing_from_robotevents', { isEditingEventSetup });

			dialogs.showConfirmation({
				title: m.error_importing_from_robotevents(),
				message: `${error instanceof Error ? error.message : 'Unknown error'}`,
				confirmText: 'OK',
				cancelButtonClass: 'hidden'
			});
		} finally {
			isImporting = false;
		}
	}

	async function handleUpdateTeams(newTeams: TeamInfoAndData[]) {
		// Reuse the id of the existing team if it exists, otherwise generate a new one
		teams = newTeams.map((team) => {
			const existingTeam = teams.find((t) => t.number === team.number);

			return {
				...team,
				id: existingTeam?.id ?? uuidv4(),
				group: existingTeam?.group ?? team.group,
				notebookLink: existingTeam?.notebookLink ?? team.notebookLink,
				hasInnovateAwardSubmissionForm: existingTeam?.hasInnovateAwardSubmissionForm ?? team.hasInnovateAwardSubmissionForm,
				notebookDevelopmentStatus: existingTeam?.notebookDevelopmentStatus ?? team.notebookDevelopmentStatus,
				absent: existingTeam?.absent ?? team.absent
			};
		});
	}

	function handleBackToBegin() {
		AppUI.appPhase = 'begin';
	}

	$effect(() => {
		if (importedData && inputDivisionId) {
			if (importedData.divisionInfos.length > 1) {
				const client = getRobotEventsClient();

				isImporting = true;
				getEventDivisionRankings(client, importedData.robotEventsEventId, inputDivisionId)
					.then((divisionRanking) => {
						isImporting = false;

						if (!importedData) return;

						divisionId = inputDivisionId;
						handleUpdateTeams(
							importedData.teamInfos.filter((team) => divisionRanking.some((ranking) => ranking.teamNumber === team.number))
						);
					})
					.catch((error) => {
						isImporting = false;
						console.error('Error getting event division rankings:', error);
						dialogs.showConfirmation({
							title: m.error_getting_event_teams_in_division(),
							message: `${error instanceof Error ? error.message : 'Unknown error'}`,
							confirmText: 'OK',
							cancelButtonClass: 'hidden'
						});
					});
			} else {
				untrack(() => {
					divisionId = inputDivisionId;
					handleUpdateTeams(importedData?.teamInfos ?? []);
				});
			}
		}
	});

	$effect(() => {
		if (importMethod === 'manual') {
			robotEventsSku = null;
			robotEventsEventId = null;
			divisionId = null;
			importedData = null;
		}
	});
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">{m.event_code_setup()}</h2>
	<div class="space-y-2">
		<p class="text-sm text-gray-600">
			{m.event_code_setup_description()}
		</p>
		<p class="text-sm text-gray-600">
			{m.event_code_setup_description_2()}
		</p>
		<p class="text-sm text-gray-600">{m.event_code_setup_description_3()}</p>
		<ul class="list-disc pl-5 text-sm text-gray-600">
			<li>
				{m.event_code_setup_description_4()}
			</li>
			<li>
				{m.event_code_setup_description_5()}
			</li>
			<li>
				{m.event_code_setup_description_6()}
			</li>
		</ul>
	</div>
	<div class="space-y-4">
		<div class="space-y-3">
			<label class="flex cursor-pointer items-stretch space-x-3">
				<input
					type="radio"
					name="importMethod"
					value="robotevents"
					checked={importMethod === 'robotevents'}
					class="mt-0.5"
					bind:group={importMethod}
				/>
				<div>
					<div class="font-medium">{m.official_event()}</div>
					<div class="text-sm text-gray-600">{m.official_event_description()}</div>
				</div>
			</label>

			<label class="flex cursor-pointer items-stretch space-x-3">
				<input
					type="radio"
					name="importMethod"
					value="manual"
					checked={importMethod === 'manual'}
					bind:group={importMethod}
					class="mt-0.5"
				/>
				<div>
					<div class="font-medium">{m.unofficial_event()}</div>
					<div class="text-sm text-gray-600">{m.unofficial_event_description()}</div>
				</div>
			</label>
		</div>
	</div>

	{#if importMethod === 'robotevents'}
		{@const isRobotEventsSkuValid = RobotEventsSkuSchema.safeParse(inputRobotEventsSku).success}
		<div class="flex items-end gap-2">
			<div>
				<!-- For public, it is called "Event Code" -->
				<label for="robotevents-sku" class="mb-2 block text-sm font-medium text-gray-700">{m.event_code()}</label>
				<input
					type="text"
					id="robotevents-sku"
					bind:value={inputRobotEventsSku}
					disabled={isImporting}
					class="classic block max-w-60"
					placeholder="e.g., RE-VRC-23-4321"
				/>
			</div>

			<button
				onclick={handleRobotEventsImport}
				disabled={isImporting || !isRobotEventsSkuValid}
				class="primary flex h-10 items-center gap-2"
			>
				{#if isImporting}
					<RefreshIcon class="h-4 w-4 animate-spin" />
					{m.importing()}
				{:else}
					{m.import_event()}
				{/if}
			</button>
		</div>
		{#if importedData}
			<div class="flex items-end gap-2">
				<div>
					<!-- For public, it is called "Event Code" -->
					<label for="division" class="mb-2 block text-sm font-medium text-gray-700">{m.division()}</label>
					<select id="division" bind:value={inputDivisionId} class="classic block w-80" disabled={isImporting}>
						{#each importedData.divisionInfos as division (division.id)}
							<option value={division.id}>{division.id}: {division.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex h-10 items-center">
					<p>{teams.length} {m.teams()}</p>
				</div>
			</div>
		{:else if robotEventsSku && robotEventsEventId && divisionId}
			<div>
				<p class="mb-2 text-sm text-gray-600">{m.division()}</p>
				<p>{m.division()} {divisionId}</p>
			</div>
		{/if}
	{/if}

	<div class="flex justify-between pt-4">
		<div class="flex space-x-3">
			{#if isEditingEventSetup}
				<button onclick={onCancel} class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					{m.cancel()}
				</button>
			{:else}
				<button
					onclick={handleBackToBegin}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					{m.back_to_begin()}
				</button>
			{/if}
		</div>
		<button onclick={onNext} class="primary" class:opacity-50={!canProceed} class:cursor-not-allowed={!canProceed} disabled={!canProceed}>
			{m.next_competition_setup()}
		</button>
	</div>
</div>
