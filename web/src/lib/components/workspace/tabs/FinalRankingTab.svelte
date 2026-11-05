<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, dialogs } from '$lib/index.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
	import { isExcellenceAward, getDesignExcellenceSwapZone, type Award } from '@judgesroom.com/protocol/src/award';
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

	type FinalRankingDrop =
		| Readonly<{
				sourceAwardName: string;
				targetAward: Award;
				movedNomination: AwardNomination;
				targetNominations: AwardNomination[];
		  }>
		| Readonly<{
				sourceAwardName: string;
				targetAward: null;
				movedNomination: AwardNomination;
		  }>;

	let { tab, isActive }: Props = $props();
	let isFetching = $state(false);
	let teamEligibilities = $state<ExcellenceAwardTeamEligibility[] | undefined>(undefined);

	const essentialData = $derived(app.getEssentialData());
	const hasRobotEventsId = $derived(!!essentialData?.robotEventsEventId && !!essentialData?.divisionId);

	const allAwards = $derived(app.getAllAwards());
	const awardNames = $derived(allAwards.map((award) => award.name));
	const allJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged'));
	const allExcellenceAwards = $derived(allAwards.filter((award) => isExcellenceAward(award.name)));
	const allRemainingJudgedAwards = $derived(allAwards.filter((award) => award.type === 'judged' && !isExcellenceAward(award.name)));

	const allTeams = $derived(app.getAllTeamInfoAndData());

	const allJudgeGroups = $derived(app.getAllJudgeGroupsInMap());

	let allFinalAwardNominations = $derived<Readonly<Record<string, Readonly<AwardNomination>[]>>>(app.getAllFinalAwardNominations());

	const allFinalAwardWinners = $derived(getJudgedAwardWinners(allJudgedAwards, allFinalAwardNominations));

	let rankingSaveInFlight = false;

	function cloneNominations(snapshot: Readonly<Record<string, Readonly<AwardNomination[]>>>): Record<string, AwardNomination[]> {
		return Object.fromEntries(
			Object.entries(snapshot).map(([awardName, nominations]) => [
				awardName,
				nominations.map(({ teamId, judgeGroupId }) => ({ teamId, judgeGroupId }))
			])
		);
	}

	async function persistFinalRankings(rankings: { awardName: string; nominations: AwardNomination[] }[]) {
		try {
			await app.wrpcClient.judging.updateFinalRankingsBatch.mutation({ rankings });
		} catch (error) {
			console.error('Failed to update judged award nominations:', error);
			app.addErrorNotice(m.failed_to_update_award_nominations());
			throw error;
		}
	}

	function sameNominationOrder(current: readonly AwardNomination[], proposed: readonly AwardNomination[]): boolean {
		return (
			current.length === proposed.length &&
			current.every(
				(nomination, index) => nomination.teamId === proposed[index].teamId && nomination.judgeGroupId === proposed[index].judgeGroupId
			)
		);
	}

	function isFinalRankingValid(awardName: string, nominations: AwardNomination[]): boolean {
		const award = allAwards.find((a) => a.name === awardName);

		if (!award) {
			console.error('CRITICAL: Award not found');
			return false;
		}

		return nominations.every((nom, index) => {
			const team = allTeams[nom.teamId];
			if (!team || nominations.findIndex((candidate) => candidate.teamId === nom.teamId) !== index) return false;
			return award.acceptedGrades.includes(team.grade);
		});
	}

	function replaceFinalAwardNominations(snapshot: Readonly<Record<string, Readonly<AwardNomination[]>>>) {
		// Wait a tick so this replacement does not collide with the drag library's own DOM update.
		// Copy into new arrays so each column sees a new value and puts its list back.
		tick().then(() => {
			allFinalAwardNominations = cloneNominations(snapshot);
		});
	}

	function rollbackJudgedAwardNominations() {
		replaceFinalAwardNominations(app.getAllFinalAwardNominations());
	}

	async function confirmRemoveFinalNomination(awardName: string, teamId: string) {
		rollbackJudgedAwardNominations();
		const team = allTeams[teamId];
		const confirmed = await dialogs.showConfirmation({
			title: m.remove_final_nomination_title(),
			message: m.remove_final_nomination_message({ team: team?.number ?? '', award: awardName }),
			confirmText: m.remove_final_nomination_confirm(),
			confirmButtonClass: 'danger'
		});
		if (!confirmed) return;

		try {
			await app.wrpcClient.judging.removeFromFinalAwardNominations.mutation({ awardName, teamId });
		} catch (error) {
			console.error('Failed to remove final nomination:', error);
			app.addErrorNotice(m.failed_to_update_award_nominations());
		}
	}

	async function handleJudgedAwardDrop(drop: FinalRankingDrop) {
		if (rankingSaveInFlight) {
			replaceFinalAwardNominations(allFinalAwardNominations);
			return;
		}

		const { sourceAwardName, targetAward, movedNomination } = drop;
		if (!targetAward) {
			await confirmRemoveFinalNomination(sourceAwardName, movedNomination.teamId);
			return;
		}

		const targetAwardName = targetAward.name;
		const targetNominations = drop.targetNominations.map(({ teamId, judgeGroupId }) => ({ teamId, judgeGroupId }));
		let sourceNominations: AwardNomination[] | null = null;

		if (sourceAwardName !== targetAwardName) {
			const currentSourceNominations = allFinalAwardNominations[sourceAwardName] ?? [];
			const movedSourceNominations = currentSourceNominations.filter((nomination) => nomination.teamId === movedNomination.teamId);
			const movedTargetNominations = targetNominations.filter((nomination) => nomination.teamId === movedNomination.teamId);
			sourceNominations = currentSourceNominations
				.filter((nomination) => nomination.teamId !== movedNomination.teamId)
				.map(({ teamId, judgeGroupId }) => ({ teamId, judgeGroupId }));

			if (
				movedSourceNominations.length !== 1 ||
				movedTargetNominations.length !== 1 ||
				!isFinalRankingValid(sourceAwardName, sourceNominations) ||
				!isFinalRankingValid(targetAwardName, targetNominations)
			) {
				rollbackJudgedAwardNominations();
				return;
			}
		} else if (!isFinalRankingValid(targetAwardName, targetNominations)) {
			rollbackJudgedAwardNominations();
			return;
		} else if (sameNominationOrder(allFinalAwardNominations[targetAwardName] ?? [], targetNominations)) {
			// Dropping a team back where it started must not rebuild the list. A second
			// replacement in the same drag update breaks Svelte's row links.
			return;
		}

		const serverSnapshot = cloneNominations(app.getAllFinalAwardNominations());
		const nextNominations = cloneNominations(allFinalAwardNominations);
		nextNominations[targetAwardName] = targetNominations;
		if (sourceNominations) nextNominations[sourceAwardName] = sourceNominations;
		allFinalAwardNominations = nextNominations;

		const rankings = [{ awardName: targetAwardName, nominations: targetNominations }];
		if (sourceNominations) rankings.push({ awardName: sourceAwardName, nominations: sourceNominations });

		rankingSaveInFlight = true;
		try {
			await persistFinalRankings(rankings);
		} catch {
			allFinalAwardNominations = cloneNominations(serverSnapshot);
		} finally {
			rankingSaveInFlight = false;
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
								zone={getDesignExcellenceSwapZone(award.name, awardNames)}
								{allTeams}
								{allJudgeGroups}
								{allFinalAwardNominations}
								onDrop={handleJudgedAwardDrop}
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
								zone={getDesignExcellenceSwapZone(award.name, awardNames)}
								{allTeams}
								{allJudgeGroups}
								{allFinalAwardNominations}
								onDrop={handleJudgedAwardDrop}
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
