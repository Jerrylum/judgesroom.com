<script lang="ts">
	import { Team, TeamList } from '$lib/teams.svelte';
	import { dndzone, TRIGGERS, SOURCES } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';
	import TeamCard from './TeamCard.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import CheckIcon from '$lib/icon/CheckIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';

	interface Props {
		groupName: string;
		teamList: Team[];
		selectedItems: TeamList;
		activeZoneId: string;
		onEditTeam: (team: Team) => void;
		onRenameGroup: (oldName: string, newName: string) => boolean;
		onDeleteGroup: (groupName: string) => void;
		showGrade?: boolean;
	}

	let {
		groupName,
		teamList = $bindable(),
		selectedItems = $bindable(),
		activeZoneId = $bindable(),
		onEditTeam,
		onRenameGroup,
		onDeleteGroup,
		showGrade = true
	}: Props = $props();

	let isEditingName = $state(false);
	let editedGroupName = $state(groupName);
	let nameInput: HTMLInputElement | null = $state(null);
	let zoneId = `zone-${groupName}-${Math.floor(Math.random() * 1000000)}`;
	const flipDurationMs = 200;

	function transformDraggedElement(el: HTMLElement | undefined) {
		if (el && !el.getAttribute('data-selected-items-count') && selectedItems.length) {
			el.setAttribute('data-selected-items-count', String(selectedItems.length + 1));
		}
	}

	interface DropEvent {
		detail: {
			items: Team[];
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
						teamList = newItems.filter((item: Team) => !selectedItems.includes(item.id));
					});
				} else {
					selectedItems = new TeamList();
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) selectedItems = new TeamList();
		teamList = newItems;
	}

	function handleTeamDrop(e: DropEvent) {
		let {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (selectedItems.length) {
			if (trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
				teamList = newItems.filter((item: Team) => !selectedItems.includes(item.id));
			} else if (
				trigger === TRIGGERS.DROPPED_INTO_ZONE ||
				trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY
			) {
				tick().then(() => {
					const idx = newItems.findIndex((item: Team) => item.id === id);
					// to support arrow up when keyboard dragging
					const sidx = Math.max(selectedItems.findIndex(id), 0);
					newItems = newItems.filter((item: Team) => !selectedItems.includes(item.id));
					newItems.splice(idx - sidx, 0, ...selectedItems);
					teamList = newItems;
					activeZoneId = zoneId;
					if (source !== SOURCES.KEYBOARD) selectedItems = new TeamList();
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
			selectedItems = new TeamList();
			activeZoneId = zoneId;
		}

		if (selectedItems.includes(teamId)) {
			selectedItems.removeById(teamId);
		} else {
			selectedItems.push(teamList.find((item) => item.id === teamId)!);
		}
	}

	function deleteGroup() {
		if (teamList.length === 0) {
			onDeleteGroup(groupName);
		}
	}

	function startEditingName() {
		isEditingName = true;
		editedGroupName = groupName;
	}

	$effect(() => {
		if (isEditingName && nameInput) {
			nameInput.focus();
		}
	});

	function saveGroupName() {
		const newName = editedGroupName.trim();
		const hasLeadingTrailingWhitespace =
			editedGroupName.length > 0 && editedGroupName !== editedGroupName.trim();

		if (
			newName &&
			newName !== groupName &&
			!hasLeadingTrailingWhitespace &&
			newName.length <= 100
		) {
			const success = onRenameGroup(groupName, newName);
			if (success) {
				isEditingName = false;
			}
			// If not successful, keep editing mode active
		} else if (newName === groupName) {
			isEditingName = false;
		}
	}

	function cancelEditingName() {
		isEditingName = false;
		editedGroupName = groupName;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveGroupName();
		} else if (event.key === 'Escape') {
			cancelEditingName();
		}
	}
</script>

<div class="min-h-[200px] rounded-lg bg-gray-50 p-4">
	<div class="mb-3 flex items-center justify-between">
		{#if isEditingName}
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={editedGroupName}
					bind:this={nameInput}
					onkeydown={handleKeydown}
					maxlength="100"
					class="classic"
				/>
				<button
					onclick={saveGroupName}
					class="text-sm text-green-600 hover:text-green-800"
					title="Save"
				>
					<CheckIcon size={24} />
				</button>
				<button
					onclick={cancelEditingName}
					class="text-sm text-red-600 hover:text-red-800"
					title="Cancel"
				>
					<CloseIcon size={24} />
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-2">
				<h4 class="font-medium text-gray-900">{groupName}</h4>
				<button
					onclick={startEditingName}
					class="text-sm text-gray-500 hover:text-gray-700"
					title="Rename group"
					aria-label={`Rename group ${groupName}`}
				>
					<EditIcon size={24} />
				</button>
			</div>
		{/if}

		{#if teamList.length === 0}
			<button onclick={deleteGroup} class="text-sm text-red-600 hover:text-red-800">
				Delete
			</button>
		{/if}
	</div>

	<div
		class="min-h-[150px] space-y-2"
		use:dndzone={{
			items: teamList,
			flipDurationMs,
			transformDraggedElement,
			dropTargetStyle: { outline: '1px solid #EEE' }
		}}
		onconsider={handleTeamConsider}
		onfinalize={handleTeamDrop}
	>
		{#each teamList as team, index (team.id)}
			<div
				animate:flip={{ duration: flipDurationMs }}
				class="draggable-team-card relative"
				class:selected={selectedItems.includes(team.id)}
				oncontextmenu={(e) => handleMaybeSelect(team.id, e)}
				role="button"
				tabindex="0"
			>
				<TeamCard bind:team={teamList[index]} onEdit={onEditTeam} {showGrade} />
			</div>
		{/each}
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
			@apply absolute top-[-0.75rem] right-[-0.75rem] z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 p-1 text-xs font-bold text-white content-[attr(data-selected-items-count)];
		}
	}
</style>
