<script lang="ts">
	import JudgeCard from './JudgeCard.svelte';
	import TeamPlate from './TeamPlate.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { type EditingJudgeGroup } from '$lib/judging.svelte';
	import { type TeamInfoAndData, EditingTeamList } from '$lib/team.svelte';
	import type { Judge } from '@judging.jerryio/protocol/src/judging';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';

	interface Props {
		judgeGroup: EditingJudgeGroup;
		selectedItems: EditingTeamList;
		activeZoneId: string;
		onDeleteGroup: (groupId: string) => void;
		showGrade: boolean;
		showAssignedTeams: boolean;
		judges: Judge[];
		onAddJudges: (judgeNames: string[]) => void;
		onRemoveJudge: (judgeId: string) => void;
		transformDraggedElement: (el: HTMLElement | undefined) => void;
		onTeamConsider: (e: DropEvent) => void;
		onTeamDrop: (e: DropEvent) => void;
		onMaybeSelect: (teamId: string, e: MouseEvent | KeyboardEvent) => void;
	}

	let {
		judgeGroup = $bindable(),
		selectedItems = $bindable(),
		activeZoneId = $bindable(),
		onDeleteGroup,
		showGrade,
		showAssignedTeams,
		judges,
		onAddJudges,
		onRemoveJudge,
		transformDraggedElement,
		onTeamConsider,
		onTeamDrop,
		onMaybeSelect
	}: Props = $props();

	let isEditingName = $state(false);
	let editingName = $state(judgeGroup.name);
	let newJudgesText = $state('');

	function startEditingName() {
		isEditingName = true;
		editingName = judgeGroup.name;
	}

	function saveGroupName() {
		const trimmedName = editingName.trim().slice(0, 100);
		if (trimmedName && trimmedName !== judgeGroup.name) {
			judgeGroup.name = trimmedName;
			isEditingName = false;
		} else if (trimmedName === judgeGroup.name) {
			isEditingName = false;
		}
	}

	function cancelEditingName() {
		isEditingName = false;
		editingName = judgeGroup.name;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveGroupName();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEditingName();
		}
	}

	async function confirmDeleteGroup() {
		const confirmed = await dialogs.showConfirmation({
			title: 'Delete Judge Group',
			message: `Are you sure you want to delete "${judgeGroup.name}"? All assigned teams will be moved back to the available teams list and all judges will be removed.`,
			confirmText: 'Delete Group',
			cancelText: 'Cancel',
			confirmButtonClass: 'danger'
		});

		if (confirmed) {
			onDeleteGroup(judgeGroup.id);
		}
	}

	function addJudges() {
		if (!newJudgesText.trim()) return;

		const judgeNames = newJudgesText
			.split('\n')
			.map((name) => name.trim())
			.filter((name) => name.length > 0);

		if (judgeNames.length > 0) {
			onAddJudges(judgeNames);
			newJudgesText = '';
		}
	}

	interface DropEvent {
		detail: {
			items: TeamInfoAndData[];
			info: {
				trigger: string;
				source: string;
				id: string;
			};
		};
	}

	const flipDurationMs = 200;
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<!-- Group Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex flex-1 items-center gap-2">
			{#if isEditingName}
				<input
					type="text"
					bind:value={editingName}
					onblur={saveGroupName}
					onkeydown={handleKeydown}
					maxlength="100"
					class="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			{:else}
				<button
					onclick={startEditingName}
					class="flex flex-1 items-center gap-1 rounded px-2 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100"
					title="Click to rename group"
				>
					<span class="truncate">{judgeGroup.name}</span>
					<EditIcon class="h-3 w-3 text-gray-400" />
				</button>
			{/if}
		</div>

		<button onclick={confirmDeleteGroup} class="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete group">
			<TrashBinIcon />
		</button>
	</div>

	<!-- Judges Section -->
	<div class="mb-4 space-y-3">
		<h4 class="text-sm font-medium text-gray-800">Judges ({judges.length})</h4>

		{#if judges.length > 0}
			<div class="space-y-2">
				{#each judges as judge (judge.id)}
					<JudgeCard {judge} {onRemoveJudge} />
				{/each}
			</div>
		{/if}

		<div class="space-y-2">
			<textarea
				bind:value={newJudgesText}
				placeholder="Enter judge names (one per line)"
				rows="2"
				class="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
			></textarea>
			<button onclick={addJudges} disabled={!newJudgesText.trim()} class="primary tiny"> Add Judges </button>
		</div>
	</div>

	<!-- Assigned Teams Section -->
	{#if showAssignedTeams}
		<div class="space-y-3">
			<h4 class="text-sm font-medium text-gray-800">
				Assigned Teams ({judgeGroup.assignedTeams.length})
			</h4>

			<div class="relative">
				<div
					class="grid min-h-[96px] grid-cols-1 gap-2 rounded border-2 border-dashed border-gray-200 bg-gray-50 p-2"
					class:border-blue-300={activeZoneId === judgeGroup.id}
					class:bg-blue-50={activeZoneId === judgeGroup.id}
					use:dndzone={{
						items: judgeGroup.assignedTeams,
						flipDurationMs,
						transformDraggedElement,
						dropTargetStyle: { outline: '1px solid #EEE' }
					}}
					onconsider={onTeamConsider}
					onfinalize={onTeamDrop}
				>
					{#each judgeGroup.assignedTeams as team (team.id)}
						<div
							animate:flip={{ duration: flipDurationMs }}
							class="draggable-team-card relative"
							class:selected={selectedItems.includes(team.id)}
							oncontextmenu={(e) => onMaybeSelect(team.id, e)}
							role="button"
							tabindex="0"
						>
							<TeamPlate {team} {showGrade} />
						</div>
					{/each}
				</div>

				{#if judgeGroup.assignedTeams.length === 0}
					<div class="flex h-full items-center justify-center text-gray-400">
						<p class="text-sm">Drop teams here</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	.draggable-team-card.selected {
		@apply opacity-80;

		:global(> *) {
			@apply bg-blue-50 outline-2 outline-blue-500;
		}

		:global(&[data-selected-items-count]::after) {
			@apply absolute right-[-0.75rem] top-[-0.75rem] z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 p-1 text-xs font-bold text-white content-[attr(data-selected-items-count)];
		}
	}
</style>
