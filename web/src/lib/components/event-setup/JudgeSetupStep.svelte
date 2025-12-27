<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import JudgeGroup from './JudgeGroup.svelte';
	import TeamPlate from './TeamPlate.svelte';
	import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick, untrack } from 'svelte';
	import { EditingJudgeGroup, createJudgeFromString, randomlyAssignTeamsToGroups, getJudgesInGroup } from '$lib/judging.svelte';
	import { EditingTeamList, type TeamInfoAndData } from '$lib/team.svelte';
	import type { JudgingMethod, Judge } from '@judgesroom.com/protocol/src/judging';
	import { dialogs } from '$lib/index.svelte';

	interface Props {
		isEditingEventSetup: boolean;
		teams: TeamInfoAndData[];
		judgingMethod: JudgingMethod;
		judgeGroups: EditingJudgeGroup[];
		unassignedTeams: TeamInfoAndData[];
		judges: Judge[];
		onNext: () => void;
		onPrev: () => void;
	}

	let {
		isEditingEventSetup,
		teams: teamsProp,
		judgingMethod = $bindable(),
		judgeGroups = $bindable(),
		unassignedTeams = $bindable(),
		judges = $bindable(),
		onNext,
		onPrev
	}: Props = $props();

	// Multi-select drag and drop states
	let selectedItems = $state(new EditingTeamList());
	let activeZoneId = $state('');

	const allTeamsHaveSameGrade = $derived(teamsProp.every((team) => team.grade === teamsProp[0]?.grade));

	const unassignedZoneId = 'unassigned-teams';

	// Initialize with default group if none exist
	// There must be at least one group
	$effect(() => {
		if (judgeGroups.length === 0) {
			judgeGroups.push(new EditingJudgeGroup('Group 1'));
		}
	});

	// If teams are updated, we need to convert TeamInfoAndData to EditingTeam for judge groups
	// Since judgeGroups still use EditingTeam internally, we need conversion logic
	$effect(() => {
		const allIncludedTeams = teamsProp.filter((team) => !team.absent);
		const allIncludedTeamIds = new Set(allIncludedTeams.map((team) => team.id));

		untrack(() => {
			// Update judge groups - remove teams that are no longer included
			judgeGroups.forEach((group) => {
				group.assignedTeams = group.assignedTeams.filter((team) => allIncludedTeamIds.has(team.id));
			});

			// Update unassigned teams - only include teams that aren't assigned to any group
			const assignedTeamIds = new Set();
			judgeGroups.forEach((group) => {
				group.assignedTeams.forEach((team) => assignedTeamIds.add(team.id));
			});

			unassignedTeams = allIncludedTeams.filter((team) => !assignedTeamIds.has(team.id));
		});
	});

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
						unassignedTeams = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
					});
				} else {
					selectedItems = new EditingTeamList();
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) selectedItems = new EditingTeamList();
		unassignedTeams = newItems;
	}

	function transformDraggedElement(el: HTMLElement | undefined) {
		if (el && !el.getAttribute('data-selected-items-count') && selectedItems.length) {
			el.setAttribute('data-selected-items-count', String(selectedItems.length + 1));
		}
	}

	function handleTeamDrop(e: DropEvent) {
		let {
			items: newItems,
			info: { trigger, source, id }
		} = e.detail;

		if (selectedItems.length) {
			if (trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
				unassignedTeams = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
			} else if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
				tick().then(() => {
					const idx = newItems.findIndex((item: TeamInfoAndData) => item.id === id);
					const sidx = Math.max(selectedItems.findIndex(id), 0);
					newItems = newItems.filter((item: TeamInfoAndData) => !selectedItems.includes(item.id));
					newItems.splice(idx - sidx, 0, ...selectedItems);
					unassignedTeams = newItems;
					activeZoneId = unassignedZoneId;
					if (source !== SOURCES.KEYBOARD) selectedItems = new EditingTeamList();
				});
			}
		} else {
			unassignedTeams = newItems;
		}
	}

	function handleMaybeSelect(teamId: string, e: MouseEvent | KeyboardEvent) {
		e.preventDefault();
		e.stopPropagation();

		if (activeZoneId !== unassignedZoneId) {
			selectedItems = new EditingTeamList();
			activeZoneId = unassignedZoneId;
		}

		if (selectedItems.includes(teamId)) {
			selectedItems.removeById(teamId);
		} else {
			selectedItems.push(unassignedTeams.find((t) => t.id === teamId)!);
		}
	}

	function addJudgeGroup() {
		judgeGroups.push(new EditingJudgeGroup(`Group ${judgeGroups.length + 1}`));
	}

	async function deleteJudgeGroup(groupId: string) {
		if (isEditingEventSetup) {
			const confirmed = await dialogs.showConfirmation({
				title: m.delete_judge_group(),
				message: m.delete_judge_group_message(),
				confirmText: m.delete_group(),
				cancelText: m.cancel(),
				confirmButtonClass: 'danger'
			});

			if (!confirmed) return;
		}

		const index = judgeGroups.findIndex((group) => group.id === groupId);
		if (index > -1) {
			const group = judgeGroups[index];
			judgeGroups.splice(index, 1);
			judgeGroups = [...judgeGroups];
			unassignedTeams = [...unassignedTeams, ...group.assignedTeams];

			// Remove judges from this group
			judges = judges.filter((judge) => judge.groupId !== group.id);
		}
	}

	// Judge management functions that will be passed to JudgeGroup components
	function addJudgesToGroup(groupId: string, judgeNames: string[]) {
		judgeNames.forEach((name) => {
			const judge = createJudgeFromString(name, groupId);
			judges.push(judge);
		});
	}

	async function removeJudgeFromGroup(judgeId: string) {
		// add warning
		if (isEditingEventSetup) {
			const confirmed = await dialogs.showConfirmation({
				title: m.remove_judge(),
				message: m.remove_judge_message(),
				confirmText: m.remove_judge(),
				cancelText: m.cancel(),
				confirmButtonClass: 'danger'
			});

			if (!confirmed) return;
		}
		judges = judges.filter((judge) => judge.id !== judgeId);
	}

	function randomlyAssignTeams() {
		randomlyAssignTeamsToGroups(teamsProp, judgeGroups);

		// Clear unassigned teams since they've been assigned
		unassignedTeams = [];
	}

	function canProceed(): boolean {
		if (judgingMethod === 'walk_in') {
			return judgeGroups.length > 0;
		} else {
			// For assigned method, all non-absent teams must be assigned
			const totalActiveTeams = unassignedTeams.length;
			return totalActiveTeams === 0;
		}
	}

	const flipDurationMs = 200;
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">{m.judge_setup()}</h2>

	<!-- Judging Method Selection -->
	<div class="space-y-4">
		<div class="space-y-3">
			<label class="flex cursor-pointer items-stretch space-x-3">
				<input
					type="radio"
					name="judgingMethod"
					value="walk_in"
					checked={judgingMethod === 'walk_in'}
					class="mt-0.5"
					bind:group={judgingMethod}
				/>
				<div>
					<div class="font-medium">{m.walk_in_judging()}</div>
					<div class="text-sm text-gray-600">{m.walk_in_judging_description()}</div>
				</div>
			</label>

			<label class="flex cursor-pointer items-stretch space-x-3">
				<input
					type="radio"
					name="judgingMethod"
					value="assigned"
					checked={judgingMethod === 'assigned'}
					bind:group={judgingMethod}
					class="mt-0.5"
				/>
				<div>
					<div class="font-medium">{m.pre_assigned_judging()}</div>
					<div class="text-sm text-gray-600">
						{m.pre_assigned_judging_description()}
					</div>
				</div>
			</label>
		</div>
	</div>

	<!-- Judge Groups Section -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-800">{m.judge_groups()}</h3>
			<div class="flex items-center gap-2">
				<button onclick={() => addJudgeGroup()} class="primary tiny">{m.add_group()}</button>
				{#if judgingMethod === 'assigned'}
					<button onclick={randomlyAssignTeams} class="primary tiny">{m.randomly_assign_teams()}</button>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
			{#each judgeGroups as judgeGroup, index (judgeGroup.id)}
				<JudgeGroup
					judgeGroup={judgeGroups[index]}
					{selectedItems}
					{activeZoneId}
					onDeleteGroup={deleteJudgeGroup}
					showGrade={!allTeamsHaveSameGrade}
					showAssignedTeams={judgingMethod === 'assigned'}
					judges={getJudgesInGroup(judges, judgeGroup.id)}
					onAddJudges={(judgeNames) => addJudgesToGroup(judgeGroup.id, judgeNames)}
					onRemoveJudge={removeJudgeFromGroup}
					{transformDraggedElement}
					onTeamConsider={handleTeamConsider}
					onTeamDrop={handleTeamDrop}
					onMaybeSelect={handleMaybeSelect}
				/>
			{/each}
		</div>
	</div>

	<!-- Available Teams Section (only show for assigned method) -->
	{#if judgingMethod === 'assigned'}
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-gray-800">
				{m.available_teams({ count: unassignedTeams.length })}
			</h3>

			{#if unassignedTeams.length > 0}
				<div class="text-sm text-gray-600">{m.drag_and_drop_teams_description()}</div>
			{:else}
				<div class="rounded-lg bg-green-50 p-4 text-green-700">✓ {m.all_active_teams_assigned_to_judge_groups()}</div>
			{/if}

			<div
				class="grid min-h-[120px] grid-cols-1 gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
				class:hidden={unassignedTeams.length === 0}
				use:dndzone={{
					items: unassignedTeams,
					flipDurationMs,
					transformDraggedElement,
					dropTargetStyle: { outline: '1px solid #EEE' }
				}}
				onconsider={handleTeamConsider}
				onfinalize={handleTeamDrop}
			>
				{#each unassignedTeams as team (team.id)}
					<div
						animate:flip={{ duration: flipDurationMs }}
						class="draggable-team-card relative"
						class:selected={selectedItems.includes(team.id)}
						oncontextmenu={(e) => handleMaybeSelect(team.id, e)}
						role="button"
						tabindex="0"
					>
						<TeamPlate {team} showGrade={!allTeamsHaveSameGrade} />
					</div>
				{/each}

				{#if unassignedTeams.length === 0}
					<div class="flex h-full items-center justify-center text-gray-500">
						<p class="text-sm">{m.all_teams_assigned_to_judge_groups()}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if !canProceed()}
		<div class="rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">
			{#if judgingMethod === 'walk_in'}
				{m.please_create_at_least_one_judge_group()}
			{:else}
				{m.please_assign_all_active_teams()}
			{/if}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex justify-between">
		<button onclick={onPrev} class="secondary">{m.back()}</button>

		<button
			onclick={onNext}
			disabled={!canProceed()}
			class="primary"
			class:opacity-50={!canProceed()}
			class:cursor-not-allowed={!canProceed()}
		>
			{m.next_awards_setup()}
		</button>
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
			@apply absolute -right-3 -top-3 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 p-1 text-xs font-bold text-white content-[attr(data-selected-items-count)];
		}
	}
</style>
