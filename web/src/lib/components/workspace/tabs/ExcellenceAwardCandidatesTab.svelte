<script lang="ts">
	import './eligibility-table.css';
	import type { ExcellenceAwardCandidatesTab } from '$lib/tab.svelte';
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
		tab: ExcellenceAwardCandidatesTab;
		isActive: boolean;
	}

	let isFetching = $state(false);
	let { tab, isActive }: Props = $props();
	let reports = $state<Record<string, ExcellenceAwardCandidatesReport>>({});

	const essentialData = $derived(app.getEssentialData());
	const hasRobotEventsId = $derived(!!essentialData?.robotEventsEventId && !!essentialData?.divisionId);
	const excellenceAwards = $derived(app.getAllAwards().filter((a) => isExcellenceAward(a.name)));

	async function fetchExcellenceAwardTeamEligibility() {
		if (!essentialData) return;
		const { robotEventsEventId, divisionId } = essentialData;
		if (!robotEventsEventId || !divisionId) return;

		isFetching = true;
		try {
			const client = getRobotEventsClient();
			const result = await getEventDivisionExcellenceAwardCandidatesReport(client, robotEventsEventId, divisionId, excellenceAwards);

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
		{#if essentialData && hasRobotEventsId}
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<div class="mb-2 flex items-start justify-between">
					<div>
						<h2 class="mb-2 text-xl font-semibold text-gray-900">Excellence Award Candidates</h2>
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
				<div class="text-sm text-gray-600">
					<p class="mb-2">
						This tool helps judges and judge advisors to identify the candidates for Excellence Awards by fetching the latest rankings and
						skills scores from RobotEvents. Please make sure to enable the feature to publish live results to RobotEvents in the Web Publish
						Setup page of Tournament Manager.
					</p>
					<p class="mb-2">
						For events with a single Excellence Award, percentages are based on the number of teams at the event. For blended grade level
						events with two grade specific Excellence Awards, percentages are based on the teams in each grade level for each award. Please
						double-check the type of event. The Judge Advisor can configure the number of Excellence Award winners by clicking the top right
						menu and selecting "Change Event Setup".
					</p>
					<p class="mb-2">
						For most of the events, all teams are in the same default division: Division 1. If your event has multiple divisions, Judges'
						Room can only calculate Excellence Award(s) for its own division (division specific). If your event has event wide Excellence
						Award(s), please refer to the "Excellence Award Eligibility" reports from the Reports tab in Tournament Manager.
					</p>
					<p class="mb-2">
						Please refer to Guide to Judging for more details regarding the key criteria of the Excellence Award. It is also recommended to
						use the "Excellence Award Eligibility" reports to verify the results.
					</p>
					<p class="mb-2">Eligible teams are highlighted in green.</p>
					<p class="mb-2">
						Event Code:
						<a
							class="text-blue-500 hover:text-blue-600"
							href={`https://robotevents.com/robot-competitions/link-to/${essentialData.robotEventsSku}.html`}
							target="_blank">{essentialData.robotEventsSku}</a
						><br />Division: {essentialData.divisionId}
					</p>
				</div>
			</div>
			{#each Object.entries(reports) as [awardName, report] (awardName)}
				{@const award = excellenceAwards.find((a) => a.name === awardName)!}
				{@const isSingleGrade = award.acceptedGrades.length === 1}
				{@const teamsInGroupCount = report.teamsInGroup.length}
				{@const rankingEligibilityIntermediate = (teamsInGroupCount * 0.4).toFixed(2)}
				{@const skillsEligibilityIntermediate = (report.joinedTeamsInEventCount * 0.4).toFixed(2)}
				{@const rankingEligibilityThreshold = report.rankingEligibilityThreshold}
				{@const skillsEligibilityThreshold = report.skillsEligibilityThreshold}
				{@const divisionId = essentialData?.divisionId}
				<div class="mb-2 rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-2 text-lg font-semibold text-gray-900">{awardName}</h3>
					<div class="mb-2 space-y-2 text-sm text-gray-600">
						{#if isSingleGrade}
							<p>
								There are {teamsInGroupCount} teams in the {award.acceptedGrades[0]} grade level <b>in Division {divisionId}</b>. At the
								conclusion of Qualification Matches, teams must be ranked in the top 40% of teams in this group in Qualification Match
								rankings. This is calculated by {teamsInGroupCount} * 40% = {rankingEligibilityIntermediate} rounded to {rankingEligibilityThreshold}
								teams.
							</p>
							<p>
								There are {report.joinedTeamsInEventCount} teams in the {award.acceptedGrades[0]} grade level <b>at the event</b>. This is
								the number of teams that actually arrived and participated in Qualification Matches. At the conclusion of the Robot Skills
								Challenge matches, teams must be ranked in the top 40% of all {award.acceptedGrades[0]} teams at the event. This is calculated
								by {report.joinedTeamsInEventCount} * 40% = {skillsEligibilityIntermediate} rounded to {skillsEligibilityThreshold} teams.
							</p>
							<p>
								At the conclusion of the Autonomous Coding Skills Challenge matches, teams must be with a score above 0 and ranked in the
								top 40% of all {award.acceptedGrades[0]} teams at the event. This is calculated by {report.joinedTeamsInEventCount}
								* 40% = {skillsEligibilityIntermediate} rounded to {skillsEligibilityThreshold} teams.
							</p>
						{:else}
							<p>
								There are {teamsInGroupCount} teams in all grade levels <b>in Division {divisionId}</b>. At the conclusion of Qualification
								Matches, teams must be ranked in the top 40% of teams in this group in Qualification Match rankings. This is calculated by {teamsInGroupCount}
								* 40% = {rankingEligibilityIntermediate}
								rounded to {rankingEligibilityThreshold} teams.
							</p>
							<p>
								There are {report.joinedTeamsInEventCount} teams in all grade levels <b>at the event</b>. This is the number of teams that
								actually arrived and participated in Qualification Matches. At the conclusion of the Robot Skills Challenge matches, teams
								must be ranked in the top 40% of all teams at the event. This is calculated by {report.joinedTeamsInEventCount} * 40% = {skillsEligibilityIntermediate}
								rounded to {skillsEligibilityThreshold} teams.
							</p>
							<p>
								At the conclusion of the Autonomous Coding Skills Challenge matches, teams must be with a score above 0 and ranked in the
								top 40% of all teams at the event. This is calculated by {report.joinedTeamsInEventCount} * 40% = {skillsEligibilityIntermediate}
								rounded to {skillsEligibilityThreshold} teams.
							</p>
						{/if}
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
												<div class="min-w-40 border-black text-center" class:text-green-500={team.qualRanking.result === 'eligible'}>
													#{team.qualRanking.no}
												</div>
												<div class="min-w-40 border-black text-center" class:text-green-500={team.overallSkills.result === 'eligible'}>
													{#if team.overallSkills.result === 'no data'}
														No Data
													{:else}
														#{team.overallSkills.no} [Score: {team.overallSkills.score}]
													{/if}
												</div>
												<div class="min-w-40 border-black text-center" class:text-green-500={team.autoSkills.result === 'eligible'}>
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
		{:else}
			<div class="flex flex-col items-center justify-center">
				<p class="text-center text-gray-500">
					This tool helps judges and judge advisors to identify the candidates for Excellence Awards by fetching the latest rankings and
					skills scores from RobotEvents. However, this Judges' Room is not connected to RobotEvents.
				</p>
			</div>
		{/if}
	</div>
</div>
