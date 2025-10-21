<script lang="ts">
	import { app } from '$lib/index.svelte';
	import type { AwardWinnerTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import { getAwardWinners, groupAwardWinnersByTeamGroup } from '$lib/award.svelte';

	interface Props {
		tab: AwardWinnerTab;
		isActive: boolean;
	}

	let { tab, isActive }: Props = $props();

	const allTeams = $derived(app.getAllTeamInfoAndData());
	const allSortedTeams = $derived(sortByTeamNumber(Object.values(allTeams)));

	const allAwards = $derived(app.getAllAwards());
	const allPerformanceAwards = $derived(allAwards.filter((award) => award.type === 'performance'));
	// const allJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged'));
	const allVolunteerNominatedAwards = $derived(allAwards.filter((award) => award.type === 'volunteer_nominated'));
	const allFinalAwardNominations = $derived(app.getAllFinalAwardNominations());

	const allAwardWinners = $derived(getAwardWinners(allAwards, allFinalAwardNominations)); // award name -> team ids
	const allAwardWinnersByTeamGroup = $derived(groupAwardWinnersByTeamGroup(allAwardWinners, allTeams)); // group id -> team id -> award names

	async function updateInputFinalRankings(awardName: string, position: number, teamId: string) {
		try {
			let nominations = allFinalAwardNominations[awardName] || [];
			if (teamId === '') {
				delete nominations[position];
			} else {
				nominations[position] = { teamId, judgeGroupId: null };
			}

			await app.wrpcClient.judging.updateFinalRankings.mutation({
				awardName,
				nominations: nominations.filter((nom) => nom.teamId !== '') // IMPORTANT
			});
		} catch (error) {
			console.error('Failed to update final rankings:', error);
			app.addErrorNotice('Failed to update award selections');
		}
	}

	function getAvailableTeams(nominations: AwardNomination[], pos: number) {
		const absentTeamIds = nominations.slice(0, pos).map((nom) => nom.teamId);
		return allSortedTeams.filter((team) => !absentTeamIds.includes(team.id));
	}

	// Get team display name
	function getTeamDisplayName(teamId: string) {
		const team = allTeams[teamId];
		return team ? `${team.number} - ${team.name}` : 'Unknown Team';
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-gray-900">Award Winner</h2>
			<p class="mt-2 text-sm text-gray-600">
				The Judge Advisor should enter all award winners below for final confirmation. Before the award ceremony, the Judge Advisor should
				enter the result to the Tournament Manager.
			</p>
		</div>

		<!-- Performance Awards -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-2 text-xl font-semibold text-gray-900">Performance Awards</h2>
			<p class="mb-6 text-sm text-gray-600">
				Performance Awards are based on robot performance on the competition field in match play and Skills Challenges. These awards do not
				impact a team's eligibility to earn a Judged Award.
			</p>

			{#if allPerformanceAwards.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">No performance awards configured for this event.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each allPerformanceAwards as award}
						<div class="rounded-lg border border-gray-200 p-4">
							<div class="mb-2 flex flex-wrap items-center justify-between">
								<h3 class="text-lg font-semibold text-gray-900">{award.name}</h3>
								<span class="text-sm text-gray-500">
									{award.winnersCount} winner{award.winnersCount > 1 ? 's' : ''}
								</span>
							</div>

							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
								{#each Array(award.winnersCount) as _, position}
									{@const nominations = allFinalAwardNominations[award.name] || []}
									{@const isDisabled = nominations.length < position}
									{@const currentSelection = nominations[position]?.teamId || ''}
									{@const availableTeams = getAvailableTeams(nominations, position)}
									<div class="space-y-1">
										<select
											id={`award-${award.name}-position-${position}`}
											disabled={isDisabled}
											value={currentSelection}
											onchange={(e) => updateInputFinalRankings(award.name, position, (e.target as HTMLSelectElement).value)}
											class="classic mt-1 block w-full disabled:opacity-50"
										>
											<option value="">Select {award.winnersCount === 1 ? 'winner' : `team ${position + 1}`}...</option>
											{#if currentSelection && !availableTeams.find((t) => t.id === currentSelection)}
												<!-- Show currently selected team even if it would normally be filtered out -->
												<option value={currentSelection}>{getTeamDisplayName(currentSelection)}</option>
											{/if}
											{#each availableTeams as team}
												<option value={team.id}>{getTeamDisplayName(team.id)}</option>
											{/each}
										</select>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Volunteer Nominated Awards -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-2 text-xl font-semibold text-gray-900">Volunteer Nominated Awards</h2>
			<p class="mb-6 text-sm text-gray-600">
				Volunteer Nominated Awards are a subset of Judged Awards that can be determined by event staff (such as Head Referees, scorekeepers,
				and emcees) based on observations during the event. These awards, particularly Sportsmanship and Energy Awards, may be determined by
				volunteer nominations instead of judges. If determined solely by volunteers, teams can still receive these awards even if they've
				already earned another Judged Award.
			</p>

			{#if allVolunteerNominatedAwards.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">No volunteer nominated awards configured for this event.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each allVolunteerNominatedAwards as award}
						<div class="rounded-lg border border-gray-200 p-4">
							<div class="mb-2 flex flex-wrap items-center justify-between">
								<h3 class="text-lg font-semibold text-gray-900">{award.name}</h3>
								<span class="text-sm text-gray-500">
									{award.winnersCount} winner{award.winnersCount > 1 ? 's' : ''}
								</span>
							</div>

							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
								{#each Array(award.winnersCount) as _, position}
									{@const nominations = allFinalAwardNominations[award.name] || []}
									{@const isDisabled = nominations.length < position}
									{@const currentSelection = nominations[position]?.teamId || ''}
									{@const availableTeams = getAvailableTeams(nominations, position)}
									<div class="space-y-1">
										<select
											id={`award-${award.name}-position-${position}`}
											disabled={isDisabled}
											value={currentSelection}
											onchange={(e) => updateInputFinalRankings(award.name, position, (e.target as HTMLSelectElement).value)}
											class="classic mt-1 block w-full disabled:opacity-50"
										>
											<option value="">Select {award.winnersCount === 1 ? 'winner' : `team ${position + 1}`}...</option>
											{#if currentSelection && !availableTeams.find((t) => t.id === currentSelection)}
												<!-- Show currently selected team even if it would normally be filtered out -->
												<option value={currentSelection}>{getTeamDisplayName(currentSelection)}</option>
											{/if}
											{#each availableTeams as team}
												<option value={team.id}>{getTeamDisplayName(team.id)}</option>
											{/each}
										</select>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Summary of Award Winners by Team Group -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-2 text-xl font-semibold text-gray-900">Summary of Award Winners</h2>
			<p class="mb-6 text-sm text-gray-600">This summary shows all award winners organized by team group.</p>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each Object.keys(allAwardWinnersByTeamGroup) as groupId}
					{@const group = allAwardWinnersByTeamGroup[groupId]}
					<div class="min-h-20 rounded-lg border border-gray-200 p-2">
						<h3 class="text-lg font-semibold text-gray-900">{groupId}</h3>
						<div class="flex flex-col gap-1">
							{#each Object.keys(group) as teamId}
								{@const team = allTeams[teamId]}
								{@const awards = group[teamId]}
								<div class="flex-colitems-center flex gap-2">
									<div class="flex flex-col justify-start">
										<p class="text-sm font-medium text-gray-900">{team.number}</p>
									</div>
									<div>
										{#if awards.length > 0}
											{#each awards as awardName}
												<p class="text-sm text-gray-500">{awardName}</p>
											{/each}
										{:else}
											<p class="text-sm text-gray-500">∅</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
