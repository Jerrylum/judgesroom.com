<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app } from '$lib/index.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
	import { isExcellenceAward, type Award } from '@judgesroom.com/protocol/src/award';
	import FinalRankingColumn from './FinalRankingColumn.svelte';
	import { tick } from 'svelte';
	import { getJudgedAwardWinners } from '$lib/award.svelte';
	import {
		getEventDivisionExcellenceAwardCandidatesReport,
		getRobotEventsClient,
		type ExcellenceAwardTeamEligibility
	} from '$lib/robotevents-source';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';
	import { sanitizeHTMLMessage } from '$lib/i18n';

	interface Props {
		tab: FinalAwardRankingTab;
		isActive: boolean;
	}

	// Interface for drag and drop events
	interface DropEvent {
		detail: {
			items: AwardNomination[];
		};
	}

	let { tab, isActive }: Props = $props();
	let isFetching = $state(false);
	let teamEligibilities = $state<ExcellenceAwardTeamEligibility[] | undefined>(undefined);

	const essentialData = $derived(app.getEssentialData());
	const hasRobotEventsId = $derived(!!essentialData?.robotEventsEventId && !!essentialData?.divisionId);

	const allAwards = $derived(app.getAllAwards());
	const allJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged'));
	const allExcellenceAwards = $derived(allAwards.filter((award) => isExcellenceAward(award.name)));
	const allRemainingJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged' && !isExcellenceAward(award.name)));

	const allTeams = $derived(app.getAllTeamInfoAndData());

	const allJudgeGroups = $derived(app.getAllJudgeGroupsInMap());

	let allFinalAwardNominations = $state<Readonly<Record<string, Readonly<AwardNomination>[]>>>({});

	$effect(() => {
		// Just like using derived, this will update the allFinalAwardNominations state when the app.getAllFinalAwardNominations state changes
		allFinalAwardNominations = app.getAllFinalAwardNominations();
	});

	const allFinalAwardWinners = $derived(getJudgedAwardWinners(allJudgedAwards, allFinalAwardNominations));

	async function updateJudgedAwardNominations(awardName: string, nominations: AwardNomination[]) {
		try {
			await app.wrpcClient.judging.updateFinalRankings.mutation({
				awardName,
				nominations
			});
		} catch (error) {
			console.error('Failed to update judged award nominations:', error);
			app.addErrorNotice(m.failed_to_update_award_nominations());
		}
	}

	let dropOut = $state<{ awardName: string; nominations: AwardNomination[] } | null>(null);
	let dragIn = $state<{ awardName: string; nominations: AwardNomination[] } | null>(null);

	function isFinalRankingValid(awardName: string, nominations: AwardNomination[]): boolean {
		const award = allAwards.find((a) => a.name === awardName);

		if (!award) {
			console.error('CRITICAL: Award not found');
			return false;
		}

		return nominations.every((nom) => {
			const team = allTeams[nom.teamId];

			return award.acceptedGrades.includes(team.grade);
		});
	}

	function rollbackJudgedAwardNominations() {
		// force all columns to rollback their editing state
		// IMPORTANT: to avoid rendering warnings, we need to wait for the next tick
		tick().then(() => {
			allFinalAwardNominations = app.getAllFinalAwardNominations();
		});
	}

	async function handleJudgedAwardDrop(award: Award, zone: string, e: DropEvent) {
		if (zone === 'Design Award') {
			const originalState = allFinalAwardNominations[award.name] || [];
			const proposedState = e.detail.items;
			if (originalState.length === proposedState.length) {
				if (isFinalRankingValid(award.name, e.detail.items)) {
					await updateJudgedAwardNominations(award.name, e.detail.items);
				} else {
					rollbackJudgedAwardNominations();
				}
				return;
			} else if (originalState.length > proposedState.length) {
				dropOut = { awardName: award.name, nominations: proposedState };
			} else {
				dragIn = { awardName: award.name, nominations: proposedState };
			}

			if (dropOut && dragIn) {
				if (isFinalRankingValid(dragIn.awardName, dragIn.nominations) && isFinalRankingValid(dropOut.awardName, dropOut.nominations)) {
					await updateJudgedAwardNominations(dragIn.awardName, dragIn.nominations);
					await updateJudgedAwardNominations(dropOut.awardName, dropOut.nominations);
				} else {
					rollbackJudgedAwardNominations();
				}
				dropOut = null;
				dragIn = null;
			}
		} else {
			if (isFinalRankingValid(award.name, e.detail.items)) {
				await updateJudgedAwardNominations(award.name, e.detail.items);
			} else {
				rollbackJudgedAwardNominations();
			}
		}
	}

	async function handleAddNomination(awardName: string, teamId: string) {
		await app.wrpcClient.judging.nominateFinalAward.mutation({ awardName, teamId, judgeGroupId: null });
	}

	async function fetchExcellenceAwardTeamEligibility() {
		if (!essentialData) return;
		const { robotEventsEventId, divisionId } = essentialData;
		if (!robotEventsEventId || !divisionId) return;

		isFetching = true;
		try {
			const client = getRobotEventsClient();
			const result = await getEventDivisionExcellenceAwardCandidatesReport(client, robotEventsEventId, divisionId, allExcellenceAwards);

			if (result.error) {
				console.error('Failed to get event from RobotEvents:', result.error);
				app.addErrorNotice(m.failed_to_get_event_from_robotevents());
				return;
			}

			teamEligibilities = Object.values(result).flatMap((report) => report.teamsInGroup);
		} catch (error) {
			console.error('Failed to get event from RobotEvents', error);
			app.addErrorNotice(m.failed_to_get_excellence_award_eligibility_data_from_robotevents());
		} finally {
			isFetching = false;
		}
	}

	$effect(() => {
		if (isActive && essentialData && hasRobotEventsId && allExcellenceAwards.length > 0) {
			fetchExcellenceAwardTeamEligibility();
		}
	});
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Judged Awards -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<div class="mb-2 flex flex-row items-start justify-between gap-3">
				<div>
					<h2 class="mb-2 text-xl font-semibold text-gray-900">{m.final_ranking()}</h2>
				</div>
				{#if hasRobotEventsId && allExcellenceAwards.length > 0}
					<button onclick={fetchExcellenceAwardTeamEligibility} disabled={isFetching} class="lightweight tiny flex items-center gap-2">
						{#if isFetching}
							<RefreshIcon class="h-4 w-4 animate-spin" />
							<span class="text-nowrap">{m.fetching()}</span>
						{:else}
							<RefreshIcon class="h-4 w-4" />
							<span class="text-nowrap">{m.refresh_from_robotevents()}</span>
						{/if}
					</button>
				{/if}
			</div>
			<p class="mb-2 text-sm text-gray-600">
				{m.final_ranking_description1()}
			</p>
			<p class="mb-2 text-sm text-gray-600">
				{m.final_ranking_description2()}
			</p>
			{#if hasRobotEventsId && teamEligibilities !== undefined}
				<p class="mb-2 text-sm text-gray-600">
					<!-- Teams in Excellence Award and Design Award columns display eligibility indicators in the top-right corner: <span
						class="font-medium text-green-600">&le;40%</span
					>
					(green) indicates the team meets the performance criteria (top 40% in qualification rankings, robot skills, and autonomous coding skills),
					<span class="font-medium text-red-600">&gt;40%</span> (red) indicates they do not meet the criteria. -->
					{@html sanitizeHTMLMessage(m.final_ranking_description3)}
				</p>
				<p class="mb-2 text-sm text-gray-600">
					<!-- Teams in Think Award column display eligibility indicators in the top-right corner: <span class="font-medium text-green-600"
						>AUTO&check;</span
					>
					(green) indicates the team participated in the Autonomous Coding Skills Challenge with a score greater than zero,
					<span class="font-medium text-red-600">AUTO&cross;</span> (red) indicates they do not meet this criteria. -->
					{@html sanitizeHTMLMessage(m.final_ranking_description4)}
				</p>
				<p class="mb-2 text-sm text-gray-600">
					<!-- Please make sure to enable the feature to publish live results to RobotEvents in the Web Publish Setup page of Tournament Manager.
					Click "Refresh from RobotEvents" to update the eligibility status. -->
					{m.final_ranking_description5()}
				</p>
			{:else if hasRobotEventsId && teamEligibilities === undefined && !isFetching}
				<p class="mb-2 text-sm text-gray-600">
					<!-- This Judges' Room failed to fetch the eligibility data from RobotEvents. Please check the Internet connection and try again. -->
					{m.final_ranking_description6()}
				</p>
			{:else if !hasRobotEventsId}
				<p class="mb-2 text-sm text-gray-600">
					<!-- This Judges' Room is not connected to RobotEvents. To enable eligibility checking, please configure the RobotEvents Event ID and
					Division ID in Event Setup. -->
					{m.final_ranking_description7()}
				</p>
			{/if}
			<p class="mb-6 text-sm text-gray-600">
				<!-- Winning teams for each award are marked with a colored border: <span class="font-medium text-green-600">green</span> for eligible
				winners, <span class="font-medium text-red-600">red</span> for ineligible winners, and
				<span class="font-medium text-slate-600">gray</span> when eligibility data is unavailable. -->
				{@html sanitizeHTMLMessage(m.final_ranking_description8)}
			</p>

			<div class="relative space-y-4 overflow-x-auto">
				<div class="flex flex-col gap-2">
					<div class="flex flex-row gap-2">
						{#each allExcellenceAwards as award (award.name)}
							<FinalRankingColumn
								{award}
								zone="Design Award"
								{allTeams}
								{allJudgeGroups}
								{allFinalAwardNominations}
								onFinalize={handleJudgedAwardDrop}
								showFullAwardName
								dropFromOthersDisabled={allFinalAwardNominations[award.name]?.length >= award.winnersCount}
								winners={allFinalAwardWinners[award.name]}
								{teamEligibilities}
							/>
						{/each}
					</div>
					<div class="flex flex-row gap-2">
						{#each allRemainingJudgedAwards as award (award.name)}
							<FinalRankingColumn
								{award}
								{allTeams}
								{allJudgeGroups}
								{allFinalAwardNominations}
								onFinalize={handleJudgedAwardDrop}
								onAddNomination={handleAddNomination}
								showAddButton={true}
								winners={allFinalAwardWinners[award.name]}
								{teamEligibilities}
							/>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
