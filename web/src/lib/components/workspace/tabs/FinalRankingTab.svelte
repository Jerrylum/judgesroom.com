<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import type { FinalAwardRankingTab } from '$lib/tab.svelte';
	import type { AwardNomination } from '@judging.jerryio/protocol/src/rubric';
	import { isExcellenceAward, type Award } from '@judging.jerryio/protocol/src/award';
	import FinalRankingColumn from './FinalRankingColumn.svelte';
	import { tick } from 'svelte';
	import { getJudgedAwardWinners } from '$lib/award.svelte';
	import {
		getEventDivisionExcellenceAwardCandidatesReport,
		getRobotEventsClient,
		type ExcellenceAwardTeamEligibility
	} from '$lib/robotevents-source';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';

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
			app.addErrorNotice('Failed to update award nominations');
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
				app.addErrorNotice('Failed to get event from RobotEvents');
				return;
			}

			teamEligibilities = Object.values(result).flatMap((report) => report.teamsInGroup);
		} catch (error) {
			console.error('Failed to get event from RobotEvents', error);
			app.addErrorNotice('Failed to get Excellence Award eligibility data from RobotEvents');
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
			<div class="mb-2 flex items-start justify-between">
				<div>
					<h2 class="mb-2 text-xl font-semibold text-gray-900">Final Ranking</h2>
				</div>
				{#if hasRobotEventsId && allExcellenceAwards.length > 0}
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
			<p class="mb-2 text-sm text-gray-600">
				Create the final ranking of award winners from nominated teams. After follow-up interviews are completed, judges who conducted those
				interviews should deliberate and rank nominees for each award. It's best practice to have first-choice winners plus three or more
				alternate candidates. Drag and drop teams to reorder nominations.
			</p>
			<p class="mb-2 text-sm text-gray-600">
				Excellence Award winners are selected from Design Award finalists who also meet Performance Award criteria, which may result in
				reshuffling other award winners to maintain the one-judged-award-per-team rule. Drag team(s) from the Design Award column to the
				Excellence Award column(s) to designate Excellence Award winner(s).
			</p>
			{#if hasRobotEventsId && teamEligibilities !== undefined}
				<p class="mb-2 text-sm text-gray-600">
					Team numbers in Excellence Award and Design Award columns are color-coded based on Excellence Award eligibility: <span
						class="font-medium text-green-600">green</span
					>
					indicates the team meets the performance criteria (top 40% in qualification rankings, robot skills, and autonomous coding skills),
					<span class="font-medium text-red-600">red</span> indicates they do not meet the criteria.
				</p>
				<p class="mb-2 text-sm text-gray-600">
					Team numbers in Think Award column are color-coded based on Think Award eligibility: <span class="font-medium text-green-600"
						>green</span
					>
					indicates the team participated in the Autonomous Coding Skills Challenge with a score greater than zero,
					<span class="font-medium text-red-600">red</span> indicates they do not meet this criteria.
				</p>
				<p class="mb-2 text-sm text-gray-600">
					Please make sure to enable the feature to publish live results to RobotEvents in the Web Publish Setup page of Tournament Manager.
					Click "Refresh from RobotEvents" to update the eligibility status.
				</p>
			{:else if hasRobotEventsId && teamEligibilities === undefined && !isFetching}
				<p class="mb-2 text-sm text-gray-600">
					This Judges' Room failed to fetch the eligibility data from RobotEvents. Please check the Internet connection and try again.
				</p>
			{:else if !hasRobotEventsId}
				<p class="mb-2 text-sm text-gray-600">
					This Judges' Room is not connected to RobotEvents. To enable eligibility checking, please configure the RobotEvents Event ID and
					Division ID in Event Setup.
				</p>
			{/if}
			<p class="mb-6 text-sm text-gray-600">
				Winning teams for each award are marked by <span class="font-medium text-green-600">green</span> border.
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
