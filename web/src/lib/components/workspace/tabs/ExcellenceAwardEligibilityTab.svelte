<script lang="ts">
	import './eligibility-table.css';
	import type { ExcellenceAwardEligibilityTab } from '$lib/tab.svelte';
	import { scrollSync } from '$lib/scroll-sync.svelte';
	import { app } from '$lib/app-page.svelte';
	import {
		getEventDivisionExcellenceAwardCandidatesReport,
		getRobotEventsClient,
		type ExcellenceAwardCandidatesReport
	} from '$lib/robotevents-source';
	import { isExcellenceAward } from '@judging.jerryio/protocol/src/award';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';

	interface Props {
		tab: ExcellenceAwardEligibilityTab;
		isActive: boolean;
	}

	let isFetching = $state(false);
	let { tab, isActive }: Props = $props();
	let reports = $state<Record<string, ExcellenceAwardCandidatesReport>>({});

	const essentialData = $derived(app.getEssentialData());
	const hasRobotEventsId = $derived(!!essentialData?.robotEventsEventId && !!essentialData?.divisionId);
	const teamInfos = $derived(app.getAllTeams());
	const excellenceAwards = $derived(app.getAllAwards().filter((a) => isExcellenceAward(a.name)));

	async function fetchExcellenceAwardTeamEligibility() {
		if (!essentialData) return;
		const { robotEventsEventId, divisionId } = essentialData;
		if (!robotEventsEventId || !divisionId) return;

		isFetching = true;
		try {
			const client = getRobotEventsClient();
			const result = await getEventDivisionExcellenceAwardCandidatesReport(
				client,
				robotEventsEventId,
				divisionId,
				teamInfos,
				excellenceAwards
			);

			if (result.error) {
				console.error('Failed to get event from RobotEvents:', result.error);
				app.addErrorNotice('Failed to get event from RobotEvents');
				return;
			}

			reports = result;
			// $inspect(eligibilityReport);
		} catch (error) {
			// TODO show alert
			console.error('Failed to get event from RobotEvents', error);
		} finally {
			isFetching = false;
		}
	}

	$effect(() => {
		if (isActive && essentialData) {
			fetchExcellenceAwardTeamEligibility();
		}
	});

	const { registerScrollContainer, scrollLeft, scrollRight } = scrollSync();
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Excellence Award Eligibility</h2>
					<p class="mt-2 text-sm text-gray-600">The eligibility of each team for the Excellence Award.</p>
				</div>
				{#if hasRobotEventsId}
					<div class="flex gap-2">
						<button onclick={fetchExcellenceAwardTeamEligibility} disabled={isFetching} class="lightweight tiny flex items-center gap-2">
							{#if isFetching}
								<RefreshIcon class="h-4 w-4 animate-spin" />
								Fetching...
							{:else}
								<RefreshIcon class="h-4 w-4" />
								Refresh from RobotEvents
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>
		{#each Object.entries(reports) as [awardName, report] (awardName)}
			{@const award = excellenceAwards.find((a) => a.name === awardName)!}
			{@const isSingleGrade = award.acceptedGrades.length === 1}
			<div class="mb-2 rounded-lg bg-white p-6 shadow-sm">
				<h3 class="text-lg font-semibold text-gray-900">{awardName}</h3>
				<div class="mb-2 space-y-1 text-sm text-gray-600">
					<!-- describe with set symbols -->

					<p>All teams in this event: U ({report.joinedTeamsInEventCount} teams)</p>
					<p>All teams in this group: G ({report.teamsInGroup.length} teams)</p>




          
					<p>Top 40% threshold: {(report.teamsInGroup.length * 0.4).toFixed(2)} rounds to {report.rankingEligibilityThreshold}</p>
					<p>Top 40% threshold: {(report.joinedTeamsInEventCount * 0.4).toFixed(2)} rounds to {report.skillsEligibilityThreshold}</p>
				</div>
				<div>
					<award-rankings-table>
						<table-header>
							<team>TEAM NUMBER</team>
							<scroll-container use:registerScrollContainer class="bg-gray-200">
								<content>
									<div class="max-w-1/3 flex min-h-14 min-w-40 items-center justify-center p-2 text-center">Qualification Rank</div>
									<div class="max-w-1/3 flex min-h-14 min-w-40 items-center justify-center p-2 text-center">Overall Skills Rank</div>
									<div class="max-w-1/3 flex min-h-14 min-w-40 items-center justify-center p-2 text-center">
										Autonomous Coding Skills Rank
									</div>
								</content>
							</scroll-container>
						</table-header>
						<table-body>
							{#each report.teamsInGroup as team (team.teamNumber)}
								<row>
									<team>
										<div class:text-green-500={team.isEligible}>
											{team.teamNumber}
										</div>
									</team>
									<scroll-container use:registerScrollContainer>
										<content>
											<div class:text-green-500={team.qualRanking.result === 'eligible'}>#{team.qualRanking.no}</div>
											<div class:text-green-500={team.overallSkills.result === 'eligible'}>
												{#if team.overallSkills.result === 'no data'}
													No Data
												{:else}
													#{team.overallSkills.no} [Score: {team.overallSkills.score}]
												{/if}
											</div>
											<div class:text-green-500={team.autoSkills.result === 'eligible'}>
												{#if team.autoSkills.result === 'no data'}
													No Data
												{:else}
													#{team.autoSkills.no} [Score: {team.autoSkills.score}]
												{/if}
											</div>
										</content>
									</scroll-container>
								</row>
							{/each}
						</table-body>
					</award-rankings-table>
				</div>
			</div>
		{/each}
	</div>
</div>
