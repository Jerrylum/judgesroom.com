<script lang="ts">
	import { JudgeGroupClass, parseJudgeNamesFromInput } from '$lib/judging.svelte';
	import { dndzone, TRIGGERS, SOURCES } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';
	import TeamPlate from './TeamPlate.svelte';
	import EditIcon from '$lib/icon/EditIcon.svelte';
	import CheckIcon from '$lib/icon/CheckIcon.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import { TeamList, type Team } from '$lib/team.svelte';

	interface Props {
		judgeGroup: JudgeGroupClass;
		selectedItems: TeamList;
		activeZoneId: string;
		onDeleteGroup: (groupId: string) => void;
		showGrade?: boolean;
		showAssignedTeams: boolean;
		judges: Array<{ id: string; name: string }>; // Optional judges to display
		onAddJudges: (judgeNames: string[]) => void;
		onRemoveJudge: (judgeId: string) => void;
	}

	let {
		judgeGroup = $bindable(),
		selectedItems = $bindable(),
		activeZoneId = $bindable(),
		onDeleteGroup,
		showGrade = true,
		showAssignedTeams,
		judges,
		onAddJudges,
		onRemoveJudge
	}: Props = $props();

	let isEditingName = $state(false);
	let editedGroupName = $state(judgeGroup.name);
	let nameInput: HTMLInputElement | null = $state(null);

	let isAddingJudge = $state(false);
	let judgeInput = $state('');
	let judgeInputRef: HTMLInputElement | null = $state(null);

	let zoneId = `judge-zone-${judgeGroup.id}`;
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
						judgeGroup.assignedTeams = newItems.filter((item: Team) => !selectedItems.includes(item.id));
					});
				} else {
					selectedItems = new TeamList();
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) selectedItems = new TeamList();
		judgeGroup.assignedTeams = newItems;
	}

	function handleTeamDrop(e: DropEvent) {
		let {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (selectedItems.length) {
			if (trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
				judgeGroup.assignedTeams = newItems.filter((item: Team) => !selectedItems.includes(item.id));
			} else if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
				tick().then(() => {
					const idx = newItems.findIndex((item: Team) => item.id === id);
					const sidx = Math.max(selectedItems.findIndex(id), 0);
					newItems = newItems.filter((item: Team) => !selectedItems.includes(item.id));
					newItems.splice(idx - sidx, 0, ...selectedItems);
					judgeGroup.assignedTeams = newItems;
					activeZoneId = zoneId;
					if (source !== SOURCES.KEYBOARD) selectedItems = new TeamList();
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
			selectedItems = new TeamList();
			activeZoneId = zoneId;
		}

		if (selectedItems.includes(teamId)) {
			selectedItems.removeById(teamId);
		} else {
			selectedItems.push(judgeGroup.assignedTeams.find((item) => item.id === teamId)!);
		}
	}

	function deleteGroup() {
		onDeleteGroup(judgeGroup.id);
	}

	function startEditingName() {
		isEditingName = true;
		editedGroupName = judgeGroup.name;
	}

	function saveGroupName() {
		const newName = editedGroupName.trim();
		const hasLeadingTrailingWhitespace = editedGroupName.length > 0 && editedGroupName !== editedGroupName.trim();

		if (newName && !hasLeadingTrailingWhitespace && newName.length <= 100) {
			judgeGroup.name = newName;
			isEditingName = false;
		}
	}

	function cancelEditingName() {
		isEditingName = false;
		editedGroupName = judgeGroup.name;
	}

	function handleNameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveGroupName();
		} else if (event.key === 'Escape') {
			cancelEditingName();
		}
	}

	// Judge management functions
	function startAddingJudge() {
		isAddingJudge = true;
		judgeInput = '';
	}

	function addJudges() {
		if (judgeInput.trim()) {
			const judgeNames = parseJudgeNamesFromInput(judgeInput);
			// Filter out names with leading/trailing whitespace
			const validJudgeNames = judgeNames.filter((name) => {
				const trimmedName = name.trim();
				return trimmedName.length > 0 && trimmedName.length <= 100 && name === trimmedName; // No leading/trailing whitespace
			});

			if (validJudgeNames.length > 0) {
				onAddJudges(validJudgeNames);
			}
			judgeInput = '';
			isAddingJudge = false;
		}
	}

	function cancelAddingJudge() {
		isAddingJudge = false;
		judgeInput = '';
	}

	function handleJudgeKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addJudges();
			startAddingJudge(); // Allow continuous adding
		} else if (event.key === 'Escape') {
			cancelAddingJudge();
		}
	}

	function handleJudgePaste(event: ClipboardEvent) {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		judgeInput = pastedText;
		addJudges();
		startAddingJudge(); // Allow continuous adding
	}

	function removeJudge(judgeId: string) {
		onRemoveJudge(judgeId);
	}

	// Auto-focus effects
	$effect(() => {
		if (isEditingName && nameInput) {
			nameInput.focus();
		}
	});

	$effect(() => {
		if (isAddingJudge && judgeInputRef) {
			judgeInputRef.focus();
		}
	});
</script>

<div class="min-h-12 rounded-lg bg-gray-50 p-4">
	<!-- Group Header -->
	<div class="mb-3 flex items-center justify-between">
		{#if isEditingName}
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={editedGroupName}
					bind:this={nameInput}
					onkeydown={handleNameKeydown}
					maxlength="100"
					class="classic"
				/>
				<button onclick={saveGroupName} class="text-sm text-green-600 hover:text-green-800" title="Save">
					<CheckIcon size={20} />
				</button>
				<button onclick={cancelEditingName} class="text-sm text-red-600 hover:text-red-800" title="Cancel">
					<CloseIcon size={20} />
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-2">
				<h4 class="font-medium text-gray-900">{judgeGroup.name}</h4>
				<button onclick={startEditingName} class="text-sm text-gray-500 hover:text-gray-700" title="Rename group">
					<EditIcon size={16} />
				</button>
			</div>
		{/if}

		{#if !isEditingName}
			<button onclick={deleteGroup} class="text-sm text-red-600 hover:text-red-800" title="Delete group (only if empty)">
				<CloseIcon size={20} />
			</button>
		{/if}
	</div>

	<!-- Judges Section -->
	<div class="mb-4">
		<div class="mb-2 flex h-6 items-center justify-between">
			<h5 class="text-sm font-medium text-gray-700">Judges ({judges.length})</h5>
			{#if !isAddingJudge}
				<button
					onclick={startAddingJudge}
					class="rounded-full bg-green-600 p-1 text-white hover:bg-green-700"
					title="Add judge"
					aria-label={`Add judge to ${judgeGroup.name}`}
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</button>
			{/if}
		</div>

		<div class="min-h-[0px] space-y-2">
			{#each judges as judge (judge.id)}
				<div class="flex items-center justify-between rounded bg-white px-2 py-1 text-sm">
					<span>{judge.name}</span>
					<button onclick={() => removeJudge(judge.id)} class="text-red-600 hover:text-red-800" title="Remove judge">
						<CloseIcon size={16} />
					</button>
				</div>
			{/each}

			{#if isAddingJudge}
				<div class="flex items-center gap-2 rounded bg-white px-2 py-1">
					<input
						type="text"
						bind:value={judgeInput}
						bind:this={judgeInputRef}
						placeholder="Judge name(s), separate with commas"
						onkeydown={handleJudgeKeydown}
						onpaste={handleJudgePaste}
						maxlength="100"
						class="flex-1 border-none bg-transparent text-sm focus:outline-none"
					/>
					<button onclick={addJudges} class="text-green-600 hover:text-green-800" title="Add judges">
						<CheckIcon size={16} />
					</button>
					<button onclick={cancelAddingJudge} class="text-red-600 hover:text-red-800" title="Cancel">
						<CloseIcon size={16} />
					</button>
				</div>
			{/if}
		</div>
	</div>
	<!-- Teams Section -->
	{#if showAssignedTeams}
		<div>
			<h5 class="mb-2 text-sm font-medium text-gray-700">
				Assigned Teams ({judgeGroup.assignedTeams.length})
			</h5>

			<div class="relative">
				<div
					class="flex max-h-[320px] min-h-[120px] flex-col space-y-2 overflow-y-auto rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-4"
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
					<div class="absolute top-0 left-0 flex h-[120px] w-full items-center justify-center text-gray-500">
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
			@apply absolute top-[-0.75rem] right-[-0.75rem] z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 p-1 text-xs font-bold text-white content-[attr(data-selected-items-count)];
		}
	}
</style>
