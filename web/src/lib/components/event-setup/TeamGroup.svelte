<script lang="ts">
	import TeamPlate from './TeamPlate.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { EditingTeamList, type TeamInfoAndData } from '$lib/team.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';
	import { tick } from 'svelte';

	interface Props {
		groupName: string;
		teamList: TeamInfoAndData[];
		selectedItems: EditingTeamList;
		activeZoneId: string;
		onRenameGroup: (oldName: string, newName: string) => boolean;
		onDeleteGroup: (groupName: string) => void;
		showGrade: boolean;
	}

	let {
		groupName,
		teamList = $bindable(),
		selectedItems = $bindable(),
		activeZoneId = $bindable(),
		onRenameGroup,
		onDeleteGroup,
		showGrade
	}: Props = $props();

	const flipDurationMs = 200;

	let isEditingName = $state(false);
	let editingName = $state(groupName);
	let zoneId = `zone-${groupName}-${Math.floor(Math.random() * 1000000)}`;

	function startEditingName() {
		isEditingName = true;
		editingName = groupName;
	}

	function saveGroupName() {
		const trimmedName = editingName.trim();
		const hasLeadingTrailingWhitespace = editingName.length > 0 && editingName !== editingName.trim();

		if (trimmedName && !hasLeadingTrailingWhitespace && trimmedName.length <= 100 && trimmedName !== groupName) {
			const success = onRenameGroup(groupName, trimmedName);
			if (success) {
				isEditingName = false;
			} else {
				// Reset to original name if rename failed
				editingName = groupName;
			}
		} else if (trimmedName === groupName) {
			isEditingName = false;
		}
	}

	function cancelEditingName() {
		isEditingName = false;
		editingName = groupName;
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

	function transformDraggedElement(el: HTMLElement | undefined) {
		if (el && !el.getAttribute('data-selected-items-count') && selectedItems.length) {
			el.setAttribute('data-selected-items-count', String(selectedItems.length + 1));
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
						teamList = newItems.filter((item) => !selectedItems.includes(item.id));
					});
				} else {
					selectedItems = new EditingTeamList();
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) selectedItems = new EditingTeamList();
		teamList = newItems;
	}

	function handleTeamDrop(e: DropEvent) {
		let {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (selectedItems.length) {
			if (trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
				teamList = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
			} else if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
				tick().then(() => {
					const idx = newItems.findIndex((item: TeamInfoAndData) => item.id === id);
					// to support arrow up when keyboard dragging
					const sidx = Math.max(selectedItems.findIndex(id), 0);
					newItems = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
					newItems.splice(idx - sidx, 0, ...selectedItems);
					teamList = newItems;
					activeZoneId = zoneId;
					if (source !== SOURCES.KEYBOARD) selectedItems = new EditingTeamList();
				});
			}
		} else {
			teamList = newItems;
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
			selectedItems.push(teamList.find((item) => item.id === teamId)!);
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<!-- Group Header -->
	<div class="mb-3 flex items-center justify-between">
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
					<span class="truncate">{groupName}</span>
					<EditIcon class="h-3 w-3 text-gray-400" />
				</button>
			{/if}
		</div>

		{#if teamList.length === 0}
			<button
				onclick={() => onDeleteGroup(groupName)}
				class="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
				title="Delete group"
			>
				<TrashBinIcon />
			</button>
		{:else}
			<span class="ml-2 text-xs text-gray-500">({teamList.length})</span>
		{/if}
	</div>

	<!-- Team List -->
	<div class="relative">
		<div
			class="grid min-h-[96px] grid-cols-1 gap-2 rounded border-2 border-dashed border-gray-200 bg-gray-50 p-2"
			class:border-blue-300={activeZoneId === groupName}
			class:bg-blue-50={activeZoneId === groupName}
			use:dndzone={{
				items: teamList,
				flipDurationMs,
				transformDraggedElement,
				dropTargetStyle: { outline: '1px solid #EEE' }
			}}
			onconsider={handleTeamConsider}
			onfinalize={handleTeamDrop}
		>
			{#each teamList as team (team.id)}
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
		{#if teamList.length === 0}
			<div class="absolute inset-0 select-none">
				<div class="flex h-full items-center justify-center text-gray-400">
					<p class="text-sm">Drop teams here</p>
				</div>
			</div>
		{/if}
	</div>
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
