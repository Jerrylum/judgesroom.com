<script lang="ts">
	import JudgeGroupComponent from './JudgeGroup.svelte';
	import TeamPlate from './TeamPlate.svelte';
	import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';
	import { JudgeGroupClass, createJudgeFromString, randomlyAssignTeamsToGroups, getJudgesInGroup } from '$lib/judging.svelte';
	import { TeamList, type Team } from '$lib/team.svelte';
	import type { JudgingMethod, Judge } from '@judging.jerryio/protocol/src/judging';

	interface Props {
		teams: Team[];
		judgingMethod: JudgingMethod;
		judgeGroups: JudgeGroupClass[];
		unassignedTeams: Team[];
		judges: Judge[];
		onNext: () => void;
		onPrev: () => void;
	}

	let {
		teams: teamsProp,
		judgingMethod = $bindable(),
		judgeGroups = $bindable(),
		unassignedTeams = $bindable(),
		judges = $bindable(),
		onNext,
		onPrev
	}: Props = $props();

	// Multi-select drag and drop states
	let selectedItems = $state(new TeamList());
	let activeZoneId = $state('');

	const allTeamsHaveSameGrade = $derived(teamsProp.every((team) => team.grade === teamsProp[0].grade));

	const unassignedZoneId = 'unassigned-teams';

	// Initialize with default group if none exist
	// There must be at least one group
	$effect(() => {
		if (judgeGroups.length === 0) {
			judgeGroups.push(new JudgeGroupClass('Group 1'));
		}
	});

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
						unassignedTeams = newItems.filter((item: Team) => !selectedItems.includes(item.id));
					});
				} else {
					selectedItems = new TeamList();
				}
			}
		}

		if (trigger === TRIGGERS.DRAG_STOPPED) selectedItems = new TeamList();
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
				unassignedTeams = newItems.filter((item: Team) => !selectedItems.includes(item.id));
			} else if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
				tick().then(() => {
					const idx = newItems.findIndex((item: Team) => item.id === id);
					// to support arrow up when keyboard dragging
					const sidx = Math.max(selectedItems.findIndex(id), 0);
					newItems = newItems.filter((item: Team) => !selectedItems.includes(item.id));
					newItems.splice(idx - sidx, 0, ...selectedItems);
					unassignedTeams = newItems;
					activeZoneId = unassignedZoneId;
					if (source !== SOURCES.KEYBOARD) selectedItems = new TeamList();
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
			selectedItems = new TeamList();
			activeZoneId = unassignedZoneId;
		}

		if (selectedItems.includes(teamId)) {
			selectedItems.removeById(teamId);
		} else {
			selectedItems.push(unassignedTeams.find((item) => item.id === teamId)!);
		}
	}

	function addJudgeGroup() {
		judgeGroups.push(new JudgeGroupClass(`Group ${judgeGroups.length + 1}`));
	}

	function deleteJudgeGroup(groupId: string) {
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

	function removeJudgeFromGroup(judgeId: string) {
		judges = judges.filter((judge) => judge.id !== judgeId);
	}

	function randomlyAssignTeams() {
		randomlyAssignTeamsToGroups(
			teamsProp.filter((team) => !team.excluded),
			judgeGroups
		);
		// Clear unassigned teams since they've been assigned
		unassignedTeams = [];
	}

	function canProceed(): boolean {
		if (judgingMethod === 'walk_in') {
			return judgeGroups.length > 0;
		} else {
			// For assigned method, all non-excluded teams must be assigned
			const totalAssignedTeams = judgeGroups.reduce((sum, group) => sum + group.assignedTeams.length, 0);
			const totalActiveTeams = teamsProp.filter((team) => !team.excluded).length;
			return totalAssignedTeams === totalActiveTeams;
		}
	}

	const flipDurationMs = 200;
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">Judge Setup</h2>

	<!-- Judging Method Selection -->
	<div class="space-y-4">
		<div class="space-y-3">
			<label class="flex cursor-pointer items-start space-x-3">
				<input
					type="radio"
					name="judgingMethod"
					value="walk_in"
					checked={judgingMethod === 'walk_in'}
					class="mt-0.5"
					bind:group={judgingMethod}
				/>
				<div>
					<div class="font-medium">Walk-in Judging</div>
					<div class="text-sm text-gray-600">Teams queue up and are assigned to judge groups randomly.</div>
				</div>
			</label>

			<label class="flex cursor-pointer items-start space-x-3">
				<input
					type="radio"
					name="judgingMethod"
					value="assigned"
					checked={judgingMethod === 'assigned'}
					bind:group={judgingMethod}
					class="mt-0.5"
				/>
				<div>
					<div class="font-medium">Pre-assigned Judging</div>
					<div class="text-sm text-gray-600">
						Teams are pre-assigned to specific judge groups. Judges find their assigned teams in their team pits for interviews.
					</div>
				</div>
			</label>
		</div>
	</div>

	<!-- Judge Groups Section -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-800">Judge Groups</h3>
			<div class="flex items-center gap-2">
				<button onclick={() => addJudgeGroup()} class="primary tiny">Add Group</button>
				{#if judgingMethod === 'assigned'}
					<button onclick={randomlyAssignTeams} class="primary tiny">Randomly Assign Teams</button>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
			{#each judgeGroups as judgeGroup, index (judgeGroup.id)}
				<JudgeGroupComponent
					judgeGroup={judgeGroups[index]}
					bind:selectedItems
					bind:activeZoneId
					onDeleteGroup={deleteJudgeGroup}
					showGrade={!allTeamsHaveSameGrade}
					showAssignedTeams={judgingMethod === 'assigned'}
					judges={getJudgesInGroup(judges, judgeGroup.id)}
					onAddJudges={(judgeNames) => addJudgesToGroup(judgeGroup.id, judgeNames)}
					onRemoveJudge={removeJudgeFromGroup}
				/>
			{/each}
		</div>
	</div>

	<!-- Available Teams Section (only show for assigned method) -->
	{#if judgingMethod === 'assigned'}
		<div class="space-y-4">
			<h3 class="text-lg font-medium text-gray-800">
				Available Teams ({unassignedTeams.length})
			</h3>

			{#if unassignedTeams.length > 0}
				<div class="text-sm text-gray-600">Drag and drop teams from here to judge groups. Right-click to select multiple teams.</div>
			{:else}
				<div class="rounded-lg bg-green-50 p-4 text-green-700">✓ All active teams are assigned to judge groups</div>
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
						<p class="text-sm">All teams are assigned to judge groups</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if !canProceed()}
		<div class="rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">
			{#if judgingMethod === 'walk_in'}
				Please create at least one judge group to continue.
			{:else}
				Please assign all active teams to judge groups to continue.
			{/if}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex justify-between">
		<button onclick={onPrev} class="secondary">Previous</button>

		<button
			onclick={onNext}
			disabled={!canProceed()}
			class="primary"
			class:opacity-50={!canProceed()}
			class:cursor-not-allowed={!canProceed()}
		>
			Review & Confirm
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
			@apply absolute top-[-0.75rem] right-[-0.75rem] z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 p-1 text-xs font-bold text-white content-[attr(data-selected-items-count)];
		}
	}
</style>
