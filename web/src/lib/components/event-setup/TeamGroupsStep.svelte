<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import TeamGroup from './TeamGroup.svelte';
	import { EditingTeamList, type TeamInfoAndData, groupTeamsByGroup } from '$lib/team.svelte';
	import { gtag } from '$lib/index.svelte';

	gtag('event', 'team_groups_step_loaded');

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
	<h2 class="text-xl font-semibold text-gray-900">{m.team_groups()}</h2>

	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-800">{m.organize_teams()}</h3>
			<div class="flex items-center gap-2">
				<input type="text" bind:value={newGroupName} placeholder="New group name" maxlength="100" class="classic" />
				<button onclick={createNewGroup} disabled={!newGroupName.trim()} class="primary tiny">{m.create_group()}</button>
			</div>
		</div>

		<p class="text-sm text-gray-600">
			{m.organize_teams_description()}
		</p>

		{#if Object.keys(teamGroups).length > 0}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
				<p class="text-gray-500">{m.no_teams_available()}</p>
			</div>
		{/if}

		<!-- Summary -->
		{#if teams.length > 0}
			<div class="rounded-lg bg-slate-50 p-4">
				<h4 class="mb-2 font-medium text-slate-900">{m.team_summary()}</h4>
				<div class="space-y-1 text-sm text-slate-800">
					<p>{m.total_teams_count({ count: teams.length })}</p>
					<p>{m.groups({ count: Object.keys(teamGroups).length })}</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="flex justify-between pt-6">
		<button onclick={onPrev} class="secondary">{m.back()}</button>
		<button onclick={onNext} class="primary">{m.next_judge_setup()}</button>
	</div>
</div>
