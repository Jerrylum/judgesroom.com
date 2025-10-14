<script lang="ts">
	import TeamGroup from './TeamGroup.svelte';
	import { EditingTeamList, type TeamInfoAndData, groupTeamsByGroup } from '$lib/team.svelte';
	
	interface Props {
		teams: TeamInfoAndData[];
		onNext: () => void;
		onPrev: () => void;
	}

	let { teams = $bindable(), onNext, onPrev }: Props = $props();

	// Team management states
	let teamGroups = $state<Record<string, TeamInfoAndData[]>>(groupTeamsByGroup(teams));
	let newGroupName = $state('');

	// Multi-select drag and drop states
	let selectedItems = $state(new EditingTeamList());
	let activeZoneId = $state('');

	const allTeamsHaveSameGrade = $derived(teams.every((team) => team.grade === teams[0]?.grade));

	function createNewGroup() {
		const trimmedName = newGroupName.trim();
		const hasLeadingTrailingWhitespace = newGroupName.length > 0 && newGroupName !== newGroupName.trim();

		if (trimmedName && !hasLeadingTrailingWhitespace && trimmedName.length <= 100 && !teamGroups[trimmedName]) {
			teamGroups[trimmedName] = [];
			newGroupName = '';
		}
	}

	function handleRenameGroup(oldName: string, newName: string): boolean {
		if (teamGroups[oldName] && !teamGroups[newName]) {
			teamGroups[newName] = teamGroups[oldName];
			delete teamGroups[oldName];
			teamGroups = { ...teamGroups };
			return true;
		}
		return false;
	}

	function handleDeleteGroup(groupName: string) {
		delete teamGroups[groupName];
		teamGroups = { ...teamGroups };
	}

	$effect(() => {
		Object.entries(teamGroups).forEach(([groupName, teamList]) => {
			teamList.forEach((team) => {
				team.group = groupName;
			});
		});
	});
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">Team Groups</h2>

	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-800">Organize Teams</h3>
			<div class="flex items-center gap-2">
				<input type="text" bind:value={newGroupName} placeholder="New group name" maxlength="100" class="classic" />
				<button onclick={createNewGroup} disabled={!newGroupName.trim()} class="primary tiny">Create Group</button>
			</div>
		</div>

		<p class="text-sm text-gray-600">
			Drag and drop teams between groups to organize them. Right click to select multiple teams. Team groups are useful when determining
			the final ranking of award winners.
		</p>

		{#if Object.keys(teamGroups).length > 0}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
				{#each Object.keys(teamGroups) as groupName (groupName)}
					<TeamGroup
						{groupName}
						bind:teamList={teamGroups[groupName]}
						bind:selectedItems
						bind:activeZoneId
						onRenameGroup={handleRenameGroup}
						onDeleteGroup={handleDeleteGroup}
						showGrade={!allTeamsHaveSameGrade}
					/>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg bg-gray-50 p-8 text-center">
				<p class="text-gray-500">No teams available. Please import teams in the previous step.</p>
			</div>
		{/if}

		<!-- Summary -->
		{#if teams.length > 0}
			<div class="rounded-lg bg-slate-50 p-4">
				<h4 class="mb-2 font-medium text-slate-900">Team Summary</h4>
				<div class="space-y-1 text-sm text-slate-800">
					<p>Total Teams: {teams.length}</p>
					<p>Groups: {Object.keys(teamGroups).length}</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="flex justify-between pt-6">
		<button onclick={onPrev} class="secondary">Back</button>
		<button onclick={onNext} class="primary">Next: Judge Setup</button>
	</div>
</div>
