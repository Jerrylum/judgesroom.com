<script lang="ts">
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
				'Manual attendance changes are disabled for RobotEvents integrated events. Use the sync button to update from RobotEvents.'
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
				app.addSuccessNotice(`Marked ${team.number} as absent`);
			} else {
				app.addSuccessNotice(`Marked ${team.number} as present`);
			}
		} catch (error) {
			app.addErrorNotice(`Failed to update attendance for ${team.number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
				app.addErrorNotice('No team rankings found. Please check-in teams in Tournament Manager and generate the match schedule first.');
			} else if (hasDifferences) {
				app.addSuccessNotice(`Found ${rankings.length} teams with rankings. Some attendance differences detected.`);
			} else {
				app.addSuccessNotice(`Found ${rankings.length} teams with rankings. Attendance is synchronized.`);
			}
		} catch (error) {
			app.addErrorNotice(`Failed to fetch attendance from RobotEvents: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
			app.addSuccessNotice('Team attendance synchronized with RobotEvents!');
		} catch (error) {
			app.addErrorNotice(`Failed to sync attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<!-- Header -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-lg font-medium text-gray-900">Team Attendance</h2>
					<p class="mt-2 text-sm text-gray-600">
						{#if hasRobotEventsId}
							Attendance is managed through RobotEvents integration. Teams with rankings are considered present.
						{:else}
							Mark teams as present or absent. Click the top right button to mark a team absent or present.
						{/if}
					</p>
				</div>
				{#if hasRobotEventsId}
					<div class="flex gap-2">
						<button onclick={fetchRobotEventsAttendance} disabled={isFetching} class="lightweight tiny flex items-center gap-2">
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
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-lg bg-gray-50 p-4">
					<div class="text-2xl font-bold text-gray-900">
						{allTeams.length}
					</div>
					<div class="text-sm text-gray-500">Total Teams</div>
				</div>
				<div class="rounded-lg bg-green-50 p-4">
					<div class="text-2xl font-bold text-green-900">
						{allTeams.filter((team) => !team.absent).length}
					</div>
					<div class="text-sm text-green-700">Present</div>
				</div>
				<div class="rounded-lg bg-red-50 p-4">
					<div class="text-2xl font-bold text-red-900">
						{allTeams.filter((team) => team.absent).length}
					</div>
					<div class="text-sm text-red-700">Absent</div>
				</div>
			</div>

			{#if hasRobotEventsId && showDifferences}
				<div class="mt-4 rounded-md bg-yellow-50 p-4">
					<div class="flex items-start">
						<div class="flex-1">
							<h3 class="text-sm font-medium text-yellow-800">Attendance Differences Detected</h3>
							<p class="mt-1 text-sm text-yellow-700">
								Some teams have different attendance status between the judging system and RobotEvents. Teams with flashing borders show the
								differences.
							</p>
						</div>
						<button
							onclick={syncAttendanceWithRobotEvents}
							class="ml-3 rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
						>
							Sync with RobotEvents
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Teams Grid -->
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-medium text-gray-900">All Teams</h3>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
									title="Mark as present"
								>
									<CloseIcon class="h-4 w-4" />
								</button>
							{:else}
								<!-- Present button (check mark) -->
								<button
									onclick={() => toggleTeamAttendance(team)}
									class="flex h-6 w-6 items-center justify-center rounded bg-green-100 text-green-600 transition-colors hover:bg-green-200 active:bg-green-300"
									title="Mark as absent"
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
