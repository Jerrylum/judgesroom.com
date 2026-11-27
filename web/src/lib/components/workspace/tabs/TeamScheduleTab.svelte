<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { app, subscriptions, tabs } from '#lib/index.svelte.ts';
	import { NotebookRubricTab, TeamInterviewRubricTab } from '#lib/tab.svelte.ts';
	import type { TeamInfoAndData } from '#lib/team.svelte.ts';
	import NotebookIcon from '#lib/icon/NotebookIcon.svelte';
	import ChatIcon from '#lib/icon/ChatIcon.svelte';
	import RefreshIcon from '#lib/icon/RefreshIcon.svelte';
	import { TEAM_SCHEDULE_ROBOT_EVENTS_RESOURCES, robotEventsCache } from '#lib/robot-events-cache.svelte.ts';

	interface Props {
		isActive: boolean;
	}

	let { isActive }: Props = $props();

	let onlyAssignedTeams = $state(true);

	const essentialData = $derived(app.getEssentialData());
	const hasRobotEventsId = $derived(!!essentialData?.robotEventsEventId && !!essentialData?.divisionId);
	const isJudgeAdvisor = $derived(app.getCurrentUser()?.role === 'judge_advisor');
	const judgeGroup = $derived(app.getCurrentUserJudgeGroup());
	const filterAssignedTeams = $derived(onlyAssignedTeams && !isJudgeAdvisor);
	const teamsById = $derived(app.getAllTeamInfoAndData());
	const assignedTeams = $derived(
		(judgeGroup?.assignedTeams ?? []).map((teamId) => teamsById[teamId]).filter((team): team is TeamInfoAndData => team != null)
	);
	const assignedTeamNumbers = $derived(new Set(assignedTeams.map((team) => team.number)));
	const rubricDoneByTeamId = $derived.by(() => {
		const done: Record<string, { notebook: boolean; interview: boolean }> = {};
		for (const cache of Object.values(subscriptions.allSubmissionCaches)) {
			const entry = (done[cache.teamId] ??= { notebook: false, interview: false });
			if (cache.enrId) entry.notebook = true;
			if (cache.tiId) entry.interview = true;
		}
		return done;
	});
	const isFetching = $derived(robotEventsCache.isFetching(TEAM_SCHEDULE_ROBOT_EVENTS_RESOURCES));
	const matches = $derived(robotEventsCache.matches.payload);
	const roomTeamsByNumber = $derived(new Map(Object.values(teamsById).map((team) => [team.number, team])));
	const scheduleRows = $derived.by(() => {
		if (!matches) return [];
		return matches
			.filter((match) => !filterAssignedTeams || match.teamNumbers.some((entry) => assignedTeamNumbers.has(entry.number)))
			.map((match) => ({
				...match,
				teams: match.teamNumbers
					.map((entry) => {
						const team = roomTeamsByNumber.get(entry.number);
						return {
							id: team?.id,
							number: entry.number,
							color: entry.color,
							assigned: !isJudgeAdvisor && assignedTeamNumbers.has(entry.number)
						};
					})
					.sort((a, b) => Number(a.color === 'blue') - Number(b.color === 'blue'))
			}))
			.sort((a, b) => Date.parse(a.scheduled) - Date.parse(b.scheduled));
	});
	const nextMatchId = $derived.by(() => {
		const now = Date.now();
		return scheduleRows.find((row) => Date.parse(row.scheduled) >= now)?.id ?? scheduleRows.at(-1)?.id ?? null;
	});

	let revealedMatchId: number | null = null;

	$effect(() => {
		if (!isActive || !hasRobotEventsId) return;
		const eventId = essentialData?.robotEventsEventId;
		const divisionId = essentialData?.divisionId;
		if (eventId == null || divisionId == null) return;
		let cancelled = false;
		void robotEventsCache.retain(eventId, divisionId, TEAM_SCHEDULE_ROBOT_EVENTS_RESOURCES).then((status) => {
			if (!cancelled && status === 'failed') {
				app.addErrorNotice(m.failed_to_fetch_team_schedule({ error: robotEventsCache.lastError || 'Unknown error' }));
			}
		});
		return () => {
			cancelled = true;
			robotEventsCache.release(TEAM_SCHEDULE_ROBOT_EVENTS_RESOURCES);
		};
	});

	$effect(() => {
		if (!isActive || nextMatchId == null || revealedMatchId != null) return;
		const node = document.getElementById(`schedule-match-${nextMatchId}`);
		if (!node) return;
		revealedMatchId = nextMatchId;
		node.scrollIntoView({ block: 'center' });
	});

	function shortDate(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function shortTime(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	function openNotebook(teamId: string) {
		tabs.addOrReuseTab(new NotebookRubricTab({ teamId }));
	}

	function openInterview(teamId: string) {
		tabs.addOrReuseTab(new TeamInterviewRubricTab({ teamId }));
	}

	async function refreshSchedule() {
		const status = await robotEventsCache.refresh(TEAM_SCHEDULE_ROBOT_EVENTS_RESOURCES);
		if (status === 'failed') {
			app.addErrorNotice(m.failed_to_fetch_team_schedule({ error: robotEventsCache.lastError || 'Unknown error' }));
		}
	}
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<div class="mb-2 flex flex-row items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-medium text-gray-900">{m.team_schedule()}</h2>
				</div>
				{#if hasRobotEventsId}
					<button onclick={refreshSchedule} disabled={isFetching} class="lightweight tiny flex items-center gap-2">
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
			<p class="text-sm text-gray-600">
				{isJudgeAdvisor ? m.team_schedule_tab_description_judge_advisor() : m.team_schedule_tab_description()}
			</p>
		</div>

		<div class="rounded-lg bg-white p-6 shadow-sm">
			{#if !hasRobotEventsId}
				<p class="text-sm text-gray-600">{m.team_schedule_unavailable()}</p>
			{:else if matches === null && robotEventsCache.matches.phase === 'failed'}
				<p class="text-sm text-gray-600">{m.failed_to_fetch_team_schedule({ error: robotEventsCache.lastError })}</p>
			{:else if matches === null}
				<p class="text-sm text-gray-600">{m.team_schedule_loading()}</p>
			{:else}
				{#if !isJudgeAdvisor}
					<label class="mb-4 flex items-start sm:items-center">
						<input type="checkbox" bind:checked={onlyAssignedTeams} class="mt-0.5 mr-2 rounded border-gray-300 sm:mt-0" />
						<span class="text-sm text-gray-700">{m.team_schedule_only_assigned_teams()}</span>
					</label>
				{/if}
				{#if filterAssignedTeams && assignedTeams.length === 0}
					<p class="text-sm text-gray-600">{m.team_schedule_no_assigned_teams()}</p>
				{:else if scheduleRows.length === 0}
					<p class="text-sm text-gray-600">{filterAssignedTeams ? m.team_schedule_empty() : m.team_schedule_empty_all()}</p>
				{:else}
					<div class="flex flex-col">
						{#each scheduleRows as row (row.id)}
							<div
								id={`schedule-match-${row.id}`}
								class="flex flex-col gap-2 border-b border-gray-200 py-3 last:border-b-0 sm:flex-row sm:items-center"
							>
								<div class={['w-24 shrink-0', { 'text-gray-400': row.started !== '' }]}>
									<div class="text-sm font-medium">{shortTime(row.scheduled)}</div>
									<div class="text-xs">{shortDate(row.scheduled)}</div>
								</div>
								<div class="w-36 shrink-0 text-sm">
									<div>{row.name}</div>
									{#if row.field}
										<div class="text-xs">{row.field}</div>
									{/if}
								</div>
								<div class="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
									{#each row.teams as team (team.number)}
										<div class={['flex w-[calc(10ch+4rem)] shrink-0 items-center rounded-md px-2', { 'bg-gray-100': team.assigned }]}>
											<span
												class={[
													'inline-block w-[10ch] shrink-0 text-sm font-medium tabular-nums',
													team.color === 'red' ? 'text-red-600' : 'text-blue-600'
												]}
											>
												{team.number}
											</span>
											{#if team.id}
												{@const teamId = team.id}
												<button
													type="button"
													onclick={() => openNotebook(teamId)}
													title={m.open_notebook_for_team({ teamNumber: team.number })}
													aria-label={m.open_notebook_for_team({ teamNumber: team.number })}
													class={[
														'flex h-8 w-6 items-center justify-center',
														rubricDoneByTeamId[teamId]?.notebook ? 'text-green-600' : 'text-gray-300'
													]}
												>
													<NotebookIcon size={16} />
												</button>
												<button
													type="button"
													onclick={() => openInterview(teamId)}
													title={m.open_interview_for_team({ teamNumber: team.number })}
													aria-label={m.open_interview_for_team({ teamNumber: team.number })}
													class={[
														'flex h-8 w-6 items-center justify-center',
														rubricDoneByTeamId[teamId]?.interview ? 'text-green-600' : 'text-gray-300'
													]}
												>
													<ChatIcon size={16} />
												</button>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
