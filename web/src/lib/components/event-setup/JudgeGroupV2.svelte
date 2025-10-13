<script lang="ts">
	import JudgeCard from './JudgeCard.svelte';
	import TeamPlateV2 from './TeamPlateV2.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick, untrack } from 'svelte';
	import { type EditingJudgeGroup } from '$lib/judging.svelte';
	import { type TeamInfoAndData, EditingTeam } from '$lib/team.svelte';
	import type { Judge } from '@judging.jerryio/protocol/src/judging';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';

	interface Props {
		isEditingEventSetup: boolean;
		judgeGroup: EditingJudgeGroup;
		selectedItems: string[];
		activeZoneId: string;
		teamsProp: TeamInfoAndData[];
		onDeleteGroup: (groupId: string) => void;
		showGrade: boolean;
		showAssignedTeams: boolean;
		judges: Judge[];
		onAddJudges: (judgeNames: string[]) => void;
		onRemoveJudge: (judgeId: string) => void;
	}

	let {
		isEditingEventSetup,
		judgeGroup,
		selectedItems,
		activeZoneId,
		teamsProp,
		onDeleteGroup,
		showGrade,
		showAssignedTeams,
		judges,
		onAddJudges,
		onRemoveJudge
	}: Props = $props();

	let isEditingName = $state(false);
	let editingName = $state(judgeGroup.name);
	let newJudgesText = $state('');

	// Convert TeamInfoAndData to EditingTeam for compatibility with existing judge group logic
	const assignedTeamInfos = $derived(judgeGroup.assignedTeams.map(editingTeam => {
		// Convert EditingTeam back to TeamInfoAndData for display
		return teamsProp.find(t => t.id === editingTeam.id) || {
			id: editingTeam.id,
			number: editingTeam.number,
			name: editingTeam.name,
			city: editingTeam.city,
			state: editingTeam.state,
			country: editingTeam.country,
			shortName: editingTeam.shortName,
			school: editingTeam.school,
			grade: editingTeam.grade,
			group: editingTeam.group,
			notebookLink: editingTeam.notebookLink,
			notebookDevelopmentStatus: editingTeam.notebookDevelopmentStatus,
			absent: editingTeam.absent
		} satisfies TeamInfoAndData;
	}));

	function startEditingName() {
		isEditingName = true;
		editingName = judgeGroup.name;
	}

	function saveGroupName() {
		const trimmedName = editingName.trim();
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

	function transformDraggedElement(el: HTMLElement | undefined) {
		if (el && !el.getAttribute('data-selected-items-count') && selectedItems.length) {
			el.setAttribute('data-selected-items-count', String(selectedItems.length + 1));
		}
	}

	function handleTeamConsider(e: DropEvent) {
		const {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (source !== SOURCES.KEYBOARD) {
			if (selectedItems.length && trigger === TRIGGERS.DRAG_STARTED) {
				if (selectedItems.includes(id)) {
					const remainingItems = selectedItems.filter(itemId => itemId !== id);
					// Convert TeamInfoAndData to EditingTeam
					const editingTeams = newItems
						.filter((item: TeamInfoAndData) => !remainingItems.includes(item.id))
						.map(teamInfo => convertToEditingTeam(teamInfo));
					judgeGroup.assignedTeams = editingTeams;
				} else {
					// Reset selection if clicking on non-selected item
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) {
			// Selection is managed by parent component
		}
		
		// Convert TeamInfoAndData to EditingTeam for storage
		const editingTeams = newItems.map(teamInfo => convertToEditingTeam(teamInfo));
		judgeGroup.assignedTeams = editingTeams;
	}

	function handleTeamDrop(e: DropEvent) {
		let {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (selectedItems.length) {
			if (trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
				const editingTeams = newItems
					.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id))
					.map(teamInfo => convertToEditingTeam(teamInfo));
				judgeGroup.assignedTeams = editingTeams;
			} else if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
				tick().then(() => {
					const idx = newItems.findIndex((item: TeamInfoAndData) => item.id === id);
					const sidx = Math.max(selectedItems.findIndex(itemId => itemId === id), 0);
					newItems = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
					
					// Get the selected team objects and convert them
					const selectedTeamObjects = selectedItems.map(selectedId => {
						return teamsProp.find(t => t.id === selectedId);
					}).filter(Boolean) as TeamInfoAndData[];
					
					newItems.splice(idx - sidx, 0, ...selectedTeamObjects);
					
					const editingTeams = newItems.map(teamInfo => convertToEditingTeam(teamInfo));
					judgeGroup.assignedTeams = editingTeams;
				});
			}
		} else {
			const editingTeams = newItems.map(teamInfo => convertToEditingTeam(teamInfo));
			judgeGroup.assignedTeams = editingTeams;
		}
	}

	function convertToEditingTeam(teamInfo: TeamInfoAndData): any {
		// Create a minimal EditingTeam-like object
		return {
			id: teamInfo.id,
			info: {
				id: teamInfo.id,
				number: teamInfo.number,
				name: teamInfo.name,
				city: teamInfo.city,
				state: teamInfo.state,
				country: teamInfo.country,
				shortName: teamInfo.shortName,
				school: teamInfo.school,
				grade: teamInfo.grade,
				group: teamInfo.group
			},
			data: {
				id: teamInfo.id,
				notebookLink: teamInfo.notebookLink,
				notebookDevelopmentStatus: teamInfo.notebookDevelopmentStatus,
				absent: teamInfo.absent
			},
			// Add getters to match EditingTeam interface
			get number() { return this.info.number; },
			get name() { return this.info.name; },
			get city() { return this.info.city; },
			get state() { return this.info.state; },
			get country() { return this.info.country; },
			get shortName() { return this.info.shortName; },
			get school() { return this.info.school; },
			get grade() { return this.info.grade; },
			get group() { return this.info.group; },
			get notebookLink() { return this.data.notebookLink; },
			get notebookDevelopmentStatus() { return this.data.notebookDevelopmentStatus; },
			get absent() { return this.data.absent; }
		};
	}

	function handleMaybeSelect(teamId: string, e: MouseEvent | KeyboardEvent) {
		e.preventDefault();
		e.stopPropagation();

		// Selection logic is handled by parent component
		// This is just a placeholder to maintain interface compatibility
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

		<button
			onclick={confirmDeleteGroup}
			class="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
			title="Delete group"
		>
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
			<button onclick={addJudges} disabled={!newJudgesText.trim()} class="primary tiny">
				Add Judges
			</button>
		</div>
	</div>

	<!-- Assigned Teams Section -->
	{#if showAssignedTeams}
		<div class="space-y-3">
			<h4 class="text-sm font-medium text-gray-800">
				Assigned Teams ({assignedTeamInfos.length})
			</h4>

			<div
				class="grid min-h-[100px] grid-cols-1 gap-2 rounded border-2 border-dashed border-gray-200 bg-gray-50 p-2"
				class:border-blue-300={activeZoneId === judgeGroup.id}
				class:bg-blue-50={activeZoneId === judgeGroup.id}
				use:dndzone={{
					items: assignedTeamInfos,
					flipDurationMs,
					transformDraggedElement,
					dropTargetStyle: { outline: '1px solid #EEE' }
				}}
				onconsider={handleTeamConsider}
				onfinalize={handleTeamDrop}
			>
				{#each assignedTeamInfos as team (team.id)}
					<div
						animate:flip={{ duration: flipDurationMs }}
						class="draggable-team-card relative"
						class:selected={selectedItems.includes(team.id)}
						oncontextmenu={(e) => handleMaybeSelect(team.id, e)}
						role="button"
						tabindex="0"
					>
						<TeamPlateV2 {team} {showGrade} />
					</div>
				{/each}

				{#if assignedTeamInfos.length === 0}
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
