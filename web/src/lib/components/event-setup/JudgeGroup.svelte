<script lang="ts">
	import JudgeCard from './JudgeCard.svelte';
	import TeamPlate from './TeamPlate.svelte';
	import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { type EditingJudgeGroup } from '$lib/judging.svelte';
	import { type TeamInfoAndData, EditingTeamList } from '$lib/team.svelte';
	import type { Judge } from '@judgesroom.com/protocol/src/judging';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';
	import { tick } from 'svelte';

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
		transformDraggedElement
	}: Props = $props();

	let isEditingName = $state(false);
	let editingName = $state(judgeGroup.name);
	let newJudgesText = $state('');

	const zoneId = $derived(`judge-zone-${judgeGroup.id}`);

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
		onDeleteGroup(judgeGroup.id);
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

	function handleTeamConsider(e: DropEvent) {
		const {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (source !== SOURCES.KEYBOARD) {
			if (selectedItems.length && trigger === TRIGGERS.DRAG_STARTED) {
				if (selectedItems.includes(id)) {
					selectedItems.removeById(id);
					tick().then(() => {
						judgeGroup.assignedTeams = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
					});
				} else {
					selectedItems = new EditingTeamList();
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) selectedItems = new EditingTeamList();
		judgeGroup.assignedTeams = newItems;
	}

	function handleTeamDrop(e: DropEvent) {
		let {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (selectedItems.length) {
			if (trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
				judgeGroup.assignedTeams = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
			} else if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
				tick().then(() => {
					const idx = newItems.findIndex((item: TeamInfoAndData) => item.id === id);
					const sidx = Math.max(selectedItems.findIndex(id), 0);
					newItems = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
					newItems.splice(idx - sidx, 0, ...selectedItems);
					judgeGroup.assignedTeams = newItems;
					activeZoneId = zoneId;
					if (source !== SOURCES.KEYBOARD) selectedItems = new EditingTeamList();
				});
			}
		} else {
			judgeGroup.assignedTeams = newItems;
		}
	}

	function handleMaybeSelect(teamId: string, e: MouseEvent | KeyboardEvent) {
		e.preventDefault();
		e.stopPropagation();

		if (activeZoneId !== zoneId) {
			selectedItems = new EditingTeamList();
			activeZoneId = zoneId;
		}

		if (selectedItems.includes(teamId)) {
			selectedItems.removeById(teamId);
		} else {
			selectedItems.push(judgeGroup.assignedTeams.find((item) => item.id === teamId)!);
		}
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
					class="h-8 flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			{:else}
				<button
					onclick={startEditingName}
					class="flex h-8 flex-1 items-center gap-1 rounded px-2 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100"
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
					class="grid max-h-[360px] min-h-[96px] grid-cols-1 gap-2 overflow-y-auto rounded border-2 border-dashed border-gray-200 bg-gray-50 p-2"
					class:border-blue-300={activeZoneId === judgeGroup.id}
					class:bg-blue-50={activeZoneId === judgeGroup.id}
					use:dndzone={{
						items: judgeGroup.assignedTeams,
						flipDurationMs,
						transformDraggedElement,
						dropTargetStyle: { outline: '1px solid #EEE' }
					}}
					onconsider={handleTeamConsider}
					onfinalize={handleTeamDrop}
				>
					{#each judgeGroup.assignedTeams as team (team.id)}
						<div
							animate:flip={{ duration: flipDurationMs }}
							class="draggable-team-card relative"
							class:selected={selectedItems.includes(team.id)}
							oncontextmenu={(e) => handleMaybeSelect(team.id, e)}
							role="button"
							tabindex="0"
						>
							<TeamPlate {team} {showGrade} />
						</div>
					{/each}
				</div>

				{#if judgeGroup.assignedTeams.length === 0}
					<div class="absolute inset-0 select-none">
						<div class="flex h-full items-center justify-center text-gray-400">
							<p class="text-sm">Drop teams here</p>
						</div>
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
