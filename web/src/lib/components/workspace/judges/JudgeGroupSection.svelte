<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, subscriptions } from '$lib/index.svelte';
	import JudgeRow from './JudgeRow.svelte';
	import TeamRow from './TeamRow.svelte';
	import { JudgeNameSchema } from '@judgesroom.com/protocol/src/judging';
	import { generateUUID } from '$lib/utils.svelte';

	interface Props {
		groupId: string;
		authTokensByJudgeId: Record<string, string>;
		searchQuery: string;
		selectedRowKey: string | null;
		onSelectRow: (rowKey: string | null) => void;
		onAccessLinksChanged?: () => void;
	}

	let { groupId, authTokensByJudgeId, searchQuery, selectedRowKey, onSelectRow, onAccessLinksChanged }: Props = $props();

	let newJudgeName = $state('');
	let adding = $state(false);

	const isAssignedJudging = $derived(app.getEssentialData()?.judgingMethod === 'assigned');
	const group = $derived(app.getAllJudgeGroups().find((g) => g.id === groupId));
	const groupName = $derived(group?.name ?? '');
	const judges = $derived(app.getExistingJudgesGroupedByGroup()[groupId] ?? []);
	const teamsById = $derived(app.getAllTeamInfoAndData());
	const submissionCaches = $derived(Object.values(subscriptions.allSubmissionCaches));
	const canReassign = $derived(isAssignedJudging && app.getAllJudgeGroups().length > 1);

	const teams = $derived.by(() => {
		if (!group) return [];
		return group.assignedTeams
			.map((teamId) => {
				const team = teamsById[teamId];
				if (!team) return null;
				const caches = submissionCaches.filter((cache) => cache.teamId === teamId);
				return {
					teamId,
					teamNumber: team.number,
					teamName: team.name,
					notebookDone: caches.some((cache) => Boolean(cache.enrId)),
					interviewDone: caches.some((cache) => Boolean(cache.tiId))
				};
			})
			.filter((team): team is NonNullable<typeof team> => team !== null);
	});

	const normalizedQuery = $derived(searchQuery.trim().toLowerCase());

	const visibleJudges = $derived(judges.filter((judge) => !normalizedQuery || judge.name.toLowerCase().includes(normalizedQuery)));

	const visibleTeams = $derived(
		teams.filter(
			(team) =>
				!normalizedQuery || team.teamNumber.toLowerCase().includes(normalizedQuery) || team.teamName.toLowerCase().includes(normalizedQuery)
		)
	);

	const notebookDone = $derived(teams.filter((team) => team.notebookDone).length);
	const interviewDone = $derived(teams.filter((team) => team.interviewDone).length);
	const teamTotal = $derived(teams.length);

	const sectionVisible = $derived(
		Boolean(group) &&
			(!normalizedQuery ||
				visibleJudges.length > 0 ||
				(isAssignedJudging && visibleTeams.length > 0) ||
				groupName.toLowerCase().includes(normalizedQuery))
	);

	async function addJudge() {
		const parsed = JudgeNameSchema.safeParse(newJudgeName.trim());
		if (!parsed.success) {
			app.addErrorNotice(parsed.error.issues[0]?.message ?? 'Invalid name');
			return;
		}
		adding = true;
		try {
			await app.wrpcClient.judge.updateJudge.mutation({
				id: generateUUID(),
				name: parsed.data,
				groupId
			});
			newJudgeName = '';
			onAccessLinksChanged?.();
		} catch (error) {
			console.error('Failed to add judge:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		} finally {
			adding = false;
		}
	}
</script>

{#if sectionVisible}
	<section class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h3 class="text-lg font-medium text-gray-900">{groupName}</h3>
			{#if isAssignedJudging}
				<p class="text-sm text-gray-600">
					{m.judge_group_progress({
						notebookDone: String(notebookDone),
						notebookTotal: String(teamTotal),
						interviewDone: String(interviewDone),
						interviewTotal: String(teamTotal)
					})}
				</p>
			{/if}
		</div>

		<div class="space-y-3">
			<h4 class="text-sm font-medium text-gray-900">{m.judges_section()}</h4>
			<div class="space-y-2">
				{#each visibleJudges as judge (judge.id)}
					<JudgeRow
						rowKey={judge.id}
						selected={selectedRowKey === judge.id}
						onSelect={onSelectRow}
						name={judge.name}
						judgeId={judge.id}
						{groupId}
						authToken={authTokensByJudgeId[judge.id] ?? null}
						{onAccessLinksChanged}
					/>
				{/each}
			</div>
			<form
				class="flex flex-wrap items-center gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					void addJudge();
				}}
			>
				<input
					type="text"
					bind:value={newJudgeName}
					placeholder={m.add_judge_placeholder()}
					maxlength="100"
					class="classic min-w-0 flex-1"
					disabled={adding}
				/>
				<button type="submit" class="secondary tiny shrink-0" disabled={adding || !newJudgeName.trim()}>
					{m.add_judge()}
				</button>
			</form>
		</div>

		{#if isAssignedJudging}
			<div class="space-y-3">
				<h4 class="text-sm font-medium text-gray-900">{m.teams_section()}</h4>
				{#if visibleTeams.length === 0}
					<p class="text-sm text-gray-500">—</p>
				{:else}
					<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{#each visibleTeams as team (team.teamId)}
							<TeamRow
								teamId={team.teamId}
								teamNumber={team.teamNumber}
								teamName={team.teamName}
								{groupId}
								notebookDone={team.notebookDone}
								interviewDone={team.interviewDone}
								{canReassign}
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>
{/if}
