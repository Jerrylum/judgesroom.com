<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app } from '$lib/index.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import CheckIcon from '$lib/icon/CheckIcon.svelte';
	import RefreshIcon from '$lib/icon/RefreshIcon.svelte';
	import { sortByTeamNumber } from '$lib/team.svelte';
	import { getRobotEventsClient, getEventDivisionRankings } from '$lib/robotevents-source';

	interface Props {
		isActive: boolean;
	}

	let { isActive }: Props = $props();

	const essentialData = $derived(app.getEssentialData());
	const hasRobotEventsId = $derived(!!essentialData?.robotEventsEventId && !!essentialData?.divisionId);
	const allTeamInfoAndData = $derived(app.getAllTeamInfoAndData());
	const allTeams = $derived(sortByTeamNumber(Object.values(allTeamInfoAndData)));

	// RobotEvents integration state
	let isFetching = $state(false);
	let robotEventsTeamNumbers = $state<Set<string>>(new Set());
	let showDifferences = $state(false);
	let hasFetched = $state(false);

	// Track teams that have differences for visual indicators
	const teamDifferences = $derived(() => {
		if (!hasFetched || !showDifferences) return new Map<string, 'should-be-present' | 'should-be-absent'>();

		const differences = new Map<string, 'should-be-present' | 'should-be-absent'>();

		allTeams.forEach((team) => {
			const isRobotEventsPresent = robotEventsTeamNumbers.has(team.number);
			const isLocalPresent = !team.absent;

			if (isRobotEventsPresent && !isLocalPresent) {
				// Team should be present but is marked absent locally
				differences.set(team.id, 'should-be-present');
			} else if (!isRobotEventsPresent && isLocalPresent) {
				// Team should be absent but is marked present locally
				differences.set(team.id, 'should-be-absent');
			}
		});

		return differences;
	});

	// Auto-fetch when tab becomes active
	$effect(() => {
		if (isActive && hasRobotEventsId && !hasFetched) {
			fetchRobotEventsAttendance();
		}
	});

	async function toggleTeamAttendance(team: TeamInfoAndData) {
		if (hasRobotEventsId) {
			app.addErrorNotice(
				m.manual_attendance_changes_disabled_for_robotevents_integrated_events()
			);
			return;
		}

		try {
			const newAbsentStatus = !team.absent;
			await app.wrpcClient.team.updateTeamData.mutation({
				id: team.id,
				notebookLink: team.notebookLink,
				hasInnovateAwardSubmissionForm: team.hasInnovateAwardSubmissionForm,
				notebookDevelopmentStatus: team.notebookDevelopmentStatus,
				absent: newAbsentStatus
			});

			if (newAbsentStatus) {
				app.addSuccessNotice(m.marked_team_as_absent({ teamNumber: team.number }));
			} else {
				app.addSuccessNotice(m.marked_team_as_present({ teamNumber: team.number }));
			}
		} catch (error) {
			app.addErrorNotice(m.failed_to_update_attendance_for_team({ teamNumber: team.number, error: error instanceof Error ? error.message : 'Unknown error' }));
		}
	}

	async function fetchRobotEventsAttendance() {
		if (!hasRobotEventsId || !essentialData?.robotEventsEventId || !essentialData?.divisionId) {
			return;
		}

		isFetching = true;
		try {
			const client = getRobotEventsClient();
			const rankings = await getEventDivisionRankings(client, essentialData.robotEventsEventId, essentialData.divisionId);

			// Teams with rankings are considered present
			robotEventsTeamNumbers = new Set(rankings.map((ranking) => ranking.teamNumber));
			hasFetched = true;

			// Check for differences
			const localPresentTeams = new Set(allTeams.filter((team) => !team.absent).map((team) => team.number));
			const robotEventsPresentTeams = robotEventsTeamNumbers;

			const hasDifferences = allTeams.some((team) => {
				const isRobotEventsPresent = robotEventsPresentTeams.has(team.number);
				const isLocalPresent = localPresentTeams.has(team.number);
				return isRobotEventsPresent !== isLocalPresent;
			});

			showDifferences = hasDifferences;

			if (rankings.length === 0) {
				app.addErrorNotice(m.no_team_rankings_found());
			} else if (hasDifferences) {
				app.addSuccessNotice(m.found_teams_with_rankings_some_attendance_differences_detected({ count: rankings.length }));
			} else {
				app.addSuccessNotice(m.found_teams_with_rankings_attendance_synchronized({ count: rankings.length }));
			}
		} catch (error) {
			app.addErrorNotice(m.failed_to_fetch_attendance_from_robotevents({ error: error instanceof Error ? error.message : 'Unknown error' }));
		} finally {
			isFetching = false;
		}
	}

	async function syncAttendanceWithRobotEvents() {
		if (!hasRobotEventsId || !hasFetched) {
			return;
		}

		try {
			const updates = allTeams.map((team) => ({
				id: team.id,
				notebookLink: team.notebookLink,
				hasInnovateAwardSubmissionForm: team.hasInnovateAwardSubmissionForm,
				notebookDevelopmentStatus: team.notebookDevelopmentStatus,
				absent: !robotEventsTeamNumbers.has(team.number)
			}));

			await app.wrpcClient.team.updateAllTeamData.mutation(updates);

			showDifferences = false;
			app.addSuccessNotice(m.team_attendance_synchronized_with_robotevents());
		} catch (error) {
			app.addErrorNotice(m.failed_to_sync_attendance({ error: error instanceof Error ? error.message : 'Unknown error' }));
		}
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row">
				<div>
					<h2 class="text-lg font-medium text-gray-900">Team Attendance</h2>
					<p class="mt-2 text-sm text-gray-600">
						{#if hasRobotEventsId}
							{m.team_attendance_description_robotevents_integrated()}
						{:else}
							{m.team_attendance_description_manual()}
						{/if}
					</p>
				</div>
				{#if hasRobotEventsId}
					<button onclick={fetchRobotEventsAttendance} disabled={isFetching} class="lightweight tiny flex items-center gap-2">
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
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-lg bg-gray-50 p-4">
					<div class="text-2xl font-bold text-gray-900">
						{allTeams.length}
					</div>
					<div class="text-sm text-gray-500">{m.total_teams()}</div>
				</div>
				<div class="rounded-lg bg-green-50 p-4">
					<div class="text-2xl font-bold text-green-900">
						{allTeams.filter((team) => !team.absent).length}
					</div>
					<div class="text-sm text-green-700">{m.present()}</div>
				</div>
				<div class="rounded-lg bg-red-50 p-4">
					<div class="text-2xl font-bold text-red-900">
						{allTeams.filter((team) => team.absent).length}
					</div>
					<div class="text-sm text-red-700">{m.absent()}</div>
				</div>
			</div>

			{#if hasRobotEventsId && showDifferences}
				<div class="mt-4 rounded-md bg-yellow-50 p-4">
					<div class="flex flex-col items-start gap-3 sm:flex-row">
						<div class="flex-1">
							<h3 class="text-sm font-medium text-yellow-800">{m.attendance_differences_detected()}</h3>
							<p class="mt-1 text-sm text-yellow-700">
								{m.some_teams_have_different_attendance_status()}
							</p>
						</div>
						<button
							onclick={syncAttendanceWithRobotEvents}
							class="rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
						>
							{m.sync_with_robotevents()}
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Teams Grid -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-medium text-gray-900">{m.all_teams()}</h3>
			<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each allTeams as team (team.id)}
					{@const teamDifference = teamDifferences().get(team.id)}
					<div
						class="team-info min-h-19 relative rounded border bg-white p-3 shadow-sm transition-all hover:shadow-md
							{team.absent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}
							{teamDifference === 'should-be-present' ? 'animate-pulse border-2 border-green-400' : ''}
							{teamDifference === 'should-be-absent' ? 'animate-pulse border-2 border-red-400' : ''}"
					>
						<div class="pr-8">
							<div class="text-sm font-medium {team.absent ? 'text-red-900' : 'text-gray-900'}">{team.number}</div>
							<div class="truncate text-xs {team.absent ? 'text-red-600' : 'text-gray-600'}">{team.name}</div>
							<div class="text-xs {team.absent ? 'text-red-500' : 'text-gray-500'}">{team.grade}</div>
						</div>
						<div class="absolute right-2 top-2">
							{#if hasRobotEventsId}
								<!-- RobotEvents managed - show status only -->
								<div
									class="flex h-6 w-6 items-center justify-center rounded {team.absent
										? 'bg-red-100 text-red-600'
										: 'bg-green-100 text-green-600'}"
								>
									{#if team.absent}
										<CloseIcon class="h-4 w-4" />
									{:else}
										<CheckIcon class="h-4 w-4" />
									{/if}
								</div>
							{:else if team.absent}
								<!-- Absent button (X mark) -->
								<button
									onclick={() => toggleTeamAttendance(team)}
									class="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-red-600 transition-colors hover:bg-red-200 active:bg-red-300"
									title={m.mark_as_present()}
								>
									<CloseIcon class="h-4 w-4" />
								</button>
							{:else}
								<!-- Present button (check mark) -->
								<button
									onclick={() => toggleTeamAttendance(team)}
									class="flex h-6 w-6 items-center justify-center rounded bg-green-100 text-green-600 transition-colors hover:bg-green-200 active:bg-green-300"
									title={m.mark_as_absent()}
								>
									<CheckIcon class="h-4 w-4" />
								</button>
							{/if}
						</div>
						<!-- {#if team.absent}
							<div class="mt-2 text-xs font-medium text-red-600">ABSENT</div>
						{/if} -->
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
