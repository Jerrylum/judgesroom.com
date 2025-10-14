<script lang="ts">
	import { dialogs } from '$lib/app-page.svelte';
	import type { AwardOptions } from '$lib/award.svelte';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';
	import {
		getEventDivisionRankings,
		getRobotEventsClient,
		importFromRobotEvents,
		type RobotEventsImportedData
	} from '$lib/robotevents-source';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { Program } from '@judging.jerryio/protocol/src/award';
	import { RobotEventsSkuSchema, type EventGradeLevel } from '@judging.jerryio/protocol/src/event';

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

	const canProceed = $derived(importMethod === 'manual' || importedData || (robotEventsSku && robotEventsEventId && divisionId));

	async function handleRobotEventsImport() {
		if (isEditingEventSetup) {
			const confirm = await dialogs.showConfirmation({
				title: 'Import from RobotEvents',
				message:
					'Are you sure you want to import from RobotEvents? Any existing teams NOT included in this import will be permanently removed from the system, along with ALL their related rubrics, award rankings, and judging data. Teams that match by team number will keep their existing data. This action cannot be undone.'
			});

			if (!confirm) {
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
				importedData = null;
				dialogs.showConfirmation({
					title: 'No Divisions Found in RobotEvents',
					message: 'No divisions found in RobotEvents. Please select a division manually.',
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

			awardOptions = data.awardOptions;

			inputRobotEventsSku = data.robotEventsSku;
			inputDivisionId = data.divisionInfos[0].id;
			importedData = data;
			dialogs.showConfirmation({
				title: 'Successfully Imported Event',
				message: `Successfully imported event "${data.eventName}" with ${data.teamInfos.length} teams`,
				confirmText: 'OK',
				cancelButtonClass: 'hidden'
			});
		} catch (error) {
			console.error('Error importing from RobotEvents:', error);
			dialogs.showConfirmation({
				title: 'Error Importing from RobotEvents',
				message: `${error instanceof Error ? error.message : 'Unknown error'}`,
				confirmText: 'OK',
				cancelButtonClass: 'hidden'
			});
		} finally {
			isImporting = false;
		}
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
						teams = importedData.teamInfos.filter((team) => divisionRanking.some((ranking) => ranking.teamNumber === team.number));
					})
					.catch((error) => {
						isImporting = false;
						console.error('Error getting event division rankings:', error);
						dialogs.showConfirmation({
							title: 'Error Getting Event Teams in Division',
							message: `${error instanceof Error ? error.message : 'Unknown error'}`,
							confirmText: 'OK',
							cancelButtonClass: 'hidden'
						});
					});
			} else {
				divisionId = inputDivisionId;
				teams = importedData.teamInfos;
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
	<h2 class="text-xl font-semibold text-gray-900">Event Code Setup</h2>
	<div class="space-y-2">
		<p class="text-sm text-gray-600">
			If your event is listed on RobotEvents.com, enter the event code below which can be found in the event page on RobotEvents.com.
		</p>
		<p class="text-sm text-gray-600">
			Judges' Room will automatically import many settings for your event. In addition, please enable the feature to publish live results to
			RobotEvents in the Web Publish Setup page of Tournament Manager. This way, Judges' Room can automatically calculate the team
			eligibility for Excellence Awards and Think Award based on the latest rankings and skills scores.
		</p>
		<p class="text-sm text-gray-600">If your event will have two or more divisions:</p>
		<ul class="list-disc pl-5 text-sm text-gray-600">
			<li>
				Please use Tournament Manager to set the division for each team and publish the division results to RobotEvents first. Judges' Room
				needs to know which teams belong to which division before it starts.
			</li>
			<li>
				Each Judges' Room can only be used for one division. Please use a second computer or browser or incognito mode to create another
				Judges' Room for the second division.
			</li>
			<li>
				Judges' Room can only calculate Excellence Award(s) for its own division (division specific). If your event has event wide
				Excellence Award(s), please refer to the "Excellence Award Eligibility" reports from the Reports tab in Tournament Manager.
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
					<div class="font-medium">Official Event</div>
					<div class="text-sm text-gray-600">Connect to RobotEvents and determine the team eligibility based on the live results.</div>
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
					<div class="font-medium">Unofficial Event</div>
					<div class="text-sm text-gray-600">Continue without connecting to RobotEvents.</div>
				</div>
			</label>
		</div>
	</div>

	{#if importMethod === 'robotevents'}
		{@const isRobotEventsSkuValid = RobotEventsSkuSchema.safeParse(inputRobotEventsSku).success}
		<div class="flex items-end gap-2">
			<div>
				<!-- For public, it is called "Event Code" -->
				<label for="robotevents-sku" class="mb-2 block text-sm font-medium text-gray-700">Event Code</label>
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
					Importing...
				{:else}
					Import Event
				{/if}
			</button>
		</div>
		{#if importedData}
			<div class="flex items-end gap-2">
				<div>
					<!-- For public, it is called "Event Code" -->
					<label for="division" class="mb-2 block text-sm font-medium text-gray-700">Division</label>
					<select id="division" bind:value={inputDivisionId} class="classic block w-80" disabled={isImporting}>
						{#each importedData.divisionInfos as division (division.id)}
							<option value={division.id}>{division.id}: {division.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex h-10 items-center">
					<p>{teams.length} teams</p>
				</div>
			</div>
		{:else if robotEventsSku && robotEventsEventId && divisionId}
			<div>
				<p class="mb-2 text-sm text-gray-600">Division</p>
				<p>Division {divisionId}</p>
			</div>
		{/if}
	{/if}

	<div class="flex justify-between pt-4">
		<div class="flex space-x-3">
			{#if isEditingEventSetup}
				<button onclick={onCancel} class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
					Cancel
				</button>
			{/if}
		</div>
		<button onclick={onNext} class="primary" class:opacity-50={!canProceed} class:cursor-not-allowed={!canProceed} disabled={!canProceed}>
			Next: Competition Setup
		</button>
	</div>
</div>
