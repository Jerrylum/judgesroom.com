<script lang="ts">
	import type { Award } from '@judging.jerryio/protocol/src/award';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import AwardNominationComponent from './AwardNomination.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { JudgeGroup } from '@judging.jerryio/protocol/src/judging';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import AddNominationDialog from './AddNominationDialog.svelte';

	interface Props {
		award: Award;
		zone?: string;
		allTeams: Readonly<Record<string, Readonly<TeamInfoAndData>>>;
		allJudgeGroups: Readonly<Record<string, Readonly<JudgeGroup>>>;
		allFinalAwardNominations: Readonly<Record<string, Readonly<AwardNomination>[]>>;
		onConsider?: (award: Award, zone: string, e: DropEvent) => void;
		onFinalize?: (award: Award, zone: string, e: DropEvent) => void;
		onAddNomination?: (awardName: string, teamId: string) => void;
		showFullAwardName?: boolean;
		dropFromOthersDisabled?: boolean;
		showAddButton?: boolean;
		winners: string[];
	}

	type AwardNominationWithId = AwardNomination & {
		id: string; // Required by dndzone
	};

	// Interface for drag and drop events
	interface DropEvent {
		detail: {
			items: AwardNominationWithId[];
			info: {
				trigger: string;
				source: string;
				id: string;
			};
		};
	}

	let {
		award,
		zone,
		allTeams,
		allJudgeGroups,
		allFinalAwardNominations,
		onConsider,
		onFinalize,
		onAddNomination,
		showFullAwardName,
		dropFromOthersDisabled,
		showAddButton,
		winners
	}: Props = $props();

	let usedZone = $derived(zone ?? award.name);
	let editing = $state<AwardNominationWithId[]>([]);
	const editingTeamIds = $derived(editing.map((nom) => nom.teamId));

	// Dialog state
	let showAddDialog = $state(false);

	$effect(() => {
		// Update (replace) the editing state whenever the allFinalAwardNominations state changes
		editing = (allFinalAwardNominations[award.name] || []).map((nom) => ({ ...nom, id: nom.teamId }));
	});

	// Drag and drop functionality for judged awards
	const flipDurationMs = 200;

	function handleConsider(e: DropEvent) {
		editing = e.detail.items;
		onConsider?.(award, usedZone, e);
	}

	function handleFinalize(e: DropEvent) {
		editing = e.detail.items;
		onFinalize?.(award, usedZone, e);
	}

	// Dialog handler functions
	function handleAddNominationClick() {
		showAddDialog = true;
	}

	function handleDialogClose() {
		showAddDialog = false;
	}

	function handleDialogConfirm(teamId: string, showAbsent: boolean, bypassRequirements: boolean) {
		onAddNomination?.(award.name, teamId);
		showAddDialog = false;
	}

	// Get absent team IDs (already nominated)
	let absentTeamIds = $derived(new Set(editing.map((nom) => nom.teamId)));
</script>

<div class="flex min-w-40 max-w-40 flex-col gap-1">
	<div class="flex flex-col flex-nowrap items-center justify-center p-2 text-center">
		<div
			class="max-w-full overflow-hidden text-ellipsis"
			class:whitespace-initial={showFullAwardName}
			class:whitespace-nowrap={!showFullAwardName}
		>
			{award.name}
		</div>
		<div class="text-xs text-gray-500">
			{winners.length}/{award.winnersCount} winner{award.winnersCount > 1 ? 's' : ''}
		</div>
	</div>
	<div class="relative">
		<div
			class="border-1 min-h-18 flex flex-col gap-1 rounded-lg border-dashed border-gray-300 bg-gray-50 p-1"
			use:dndzone={{
				items: editing,
				flipDurationMs,
				dropTargetStyle: { border: '1px solid #3B82F6' },
				dropFromOthersDisabled: dropFromOthersDisabled,
				type: usedZone,
				delayTouchStart: true
			}}
			onconsider={(e) => handleConsider(e)}
			onfinalize={(e) => handleFinalize(e)}
		>
			{#each editing as nom, index (nom.id)}
				{@const isWinner = winners.includes(nom.teamId)}
				{@const isBeforeLastWinner = winners.length > 0 && editingTeamIds.indexOf(winners[winners.length - 1]) > index}
				{@const isSkipped = !isWinner && isBeforeLastWinner}
				<div animate:flip={{ duration: flipDurationMs }}>
					<AwardNominationComponent
						team={allTeams[nom.teamId]}
						judgeGroup={nom.judgeGroupId ? allJudgeGroups[nom.judgeGroupId] : null}
						{isWinner}
						{isSkipped}
					/>
				</div>
			{/each}
		</div>
		{#if editing.length === 0}
			<div class="absolute bottom-0 left-0 right-0 top-0 flex h-full min-h-10 items-center justify-center text-gray-500">
				<p class="text-sm">No nominations yet</p>
			</div>
		{/if}
	</div>
	<div>
		{#if showAddButton}
			<button
				onclick={handleAddNominationClick}
				class="w-full border-gray-300 text-center text-sm text-green-600 underline hover:text-green-800">+ Add Nomination</button
			>
		{/if}
	</div>
</div>

<!-- Add Nomination Dialog -->
<AddNominationDialog
	open={showAddDialog}
	{award}
	{allTeams}
	{absentTeamIds}
	onClose={handleDialogClose}
	onConfirm={handleDialogConfirm}
/>
