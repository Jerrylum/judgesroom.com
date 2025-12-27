<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, dialogs } from '$lib/index.svelte';
	import type { AwardWinnerTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import { getAwardWinners, groupAwardWinnersByTeamGroup } from '$lib/award.svelte';
	import AwardWinnersReportDialog, { type TeamPresentationConfig } from './AwardWinnersReportDialog.svelte';

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
			app.addErrorNotice(m.failed_to_update_award_selections());
		}
	}

	function getAvailableTeams(nominations: AwardNomination[], pos: number) {
		const absentTeamIds = nominations.slice(0, pos).map((nom) => nom.teamId);
		return allSortedTeams.filter((team) => !absentTeamIds.includes(team.id));
	}

	// Get team display name
	function getTeamDisplayName(teamId: string) {
		const team = allTeams[teamId];
		return team ? `${team.number} - ${team.name}` : m.unknown_team();
	}

	// Format team display based on configuration
	function formatTeamDisplay(teamId: string, config: TeamPresentationConfig): string {
		const team = allTeams[teamId];
		if (!team) return m.unknown_team();

		const parts: string[] = [];
		if (config.showTeamNumber) parts.push(team.number);
		if (config.showTeamName && team.name) parts.push(team.name);
		if (config.showSchool && team.school) parts.push(team.school);
		if (config.showCountry && team.country) parts.push(team.country);

		return parts.length > 0 ? parts.join(', ') : team.number;
	}

	// Generate report text based on configuration
	function generateReportText(config: TeamPresentationConfig): string {
		const lines: string[] = [];

		// Iterate through all awards in order
		for (const award of allAwards) {
			const winners = allAwardWinners[award.name] || [];
			const teamDisplays = winners.map((teamId) => formatTeamDisplay(teamId, config)).filter((display) => display !== null);

			if (teamDisplays.length > 0) {
				lines.push(`${award.name}:\n${teamDisplays.map((display) => ` - ${display}`).join('\n')}`);
			} else {
				lines.push(`${award.name}: no teams`);
			}
		}

		return lines.join('\n');
	}

	// Open report dialog
	function openReportDialog() {
		dialogs.showCustom(AwardWinnersReportDialog, {
			props: { generateReportText }
		});
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-gray-900">{m.award_winner_tab_title()}</h2>
			<p class="mt-2 text-sm text-gray-600">
				{m.award_winner_tab_description()}
			</p>
		</div>

		<!-- Performance Awards -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-2 text-xl font-semibold text-gray-900">{m.performance_awards()}</h2>
			<p class="mb-6 text-sm text-gray-600">
				{m.award_winner_tab_performance_awards_description()}
			</p>

			{#if allPerformanceAwards.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">{m.no_performance_awards_configured_for_this_event()}</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each allPerformanceAwards as award}
						<div class="rounded-lg border border-gray-200 p-4">
							<div class="mb-2 flex flex-wrap items-center justify-between">
								<h3 class="text-lg font-semibold text-gray-900">{award.name}</h3>
								<span class="text-sm text-gray-500">
									{m.number_of_winners_count({ count: award.winnersCount })}
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
											<option value="">{m.select_winner({ winnersCount: award.winnersCount, position: position + 1 })}</option>
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
			<h2 class="mb-2 text-xl font-semibold text-gray-900">{m.volunteer_nominated_awards()}</h2>
			<p class="mb-6 text-sm text-gray-600">
				{m.award_winner_tab_volunteer_nominated_awards_description()}
			</p>

			{#if allVolunteerNominatedAwards.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">{m.no_volunteer_nominated_awards_configured_for_this_event()}</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each allVolunteerNominatedAwards as award}
						<div class="rounded-lg border border-gray-200 p-4">
							<div class="mb-2 flex flex-wrap items-center justify-between">
								<h3 class="text-lg font-semibold text-gray-900">{award.name}</h3>
								<span class="text-sm text-gray-500">
									{m.number_of_winners_count({ count: award.winnersCount })}
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
											<option value="">{m.select_winner({ winnersCount: award.winnersCount, position: position + 1 })}</option>
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
			<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">{m.summary_of_award_winners()}</h2>
				</div>
				<button onclick={openReportDialog} class="primary tiny">{m.report()}</button>
			</div>
			<p class="mb-6 text-sm text-gray-600">{m.award_winner_tab_summary_of_award_winners_description()}</p>

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
