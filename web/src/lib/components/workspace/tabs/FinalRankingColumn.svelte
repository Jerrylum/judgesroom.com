<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isExcellenceAward, isDesignAward, getPairedExcellenceAwardName, type Award } from '@judgesroom.com/protocol/src/award';
	import { dndzone, TRIGGERS, type DndEvent } from 'svelte-dnd-action';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';
	import { flip } from 'svelte/animate';
	import AwardNominationComponent from './AwardNomination.svelte';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';
	import type { AwardNomination } from '@judgesroom.com/protocol/src/rubric';
	import AddNominationDialog from './AddNominationDialog.svelte';
	import type { ExcellenceAwardTeamEligibility } from '$lib/robotevents-source';

	interface Props {
		award: Award;
		zone?: string;
		allTeams: Readonly<Record<string, Readonly<TeamInfoAndData>>>;
		allJudgeGroups: Readonly<Record<string, Readonly<JudgeGroup>>>;
		allFinalAwardNominations: Readonly<Record<string, Readonly<AwardNomination>[]>>;
		onDrop?: (drop: FinalRankingDrop) => void;
		onAddNomination?: (awardName: string, teamId: string) => void;
		dropFromOthersDisabled?: boolean;
		showAddButton?: boolean;
		winners: string[];
		teamEligibilities?: Readonly<Readonly<ExcellenceAwardTeamEligibility>[]>;
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

	type DraggableAwardNomination = AwardNomination &
		Readonly<{
			id: string;
			sourceAwardName: string;
		}>;

	type DropEvent = CustomEvent<DndEvent<DraggableAwardNomination>>;

	let {
		award,
		zone,
		allTeams,
		allJudgeGroups,
		allFinalAwardNominations,
		onDrop,
		onAddNomination,
		dropFromOthersDisabled,
		showAddButton,
		winners,
		teamEligibilities
	}: Props = $props();

	let usedZone = $derived(zone ?? award.name);
	let editing = $derived<DraggableAwardNomination[]>(nominationsFromServer());
	let removeWellItems = $state<DraggableAwardNomination[]>([]);
	const editingTeamIds = $derived(editing.map((nom) => nom.teamId));

	function nominationsFromServer(): DraggableAwardNomination[] {
		return (allFinalAwardNominations[award.name] || []).map((nomination) => ({
			...nomination,
			id: JSON.stringify([award.name, nomination.teamId]),
			sourceAwardName: award.name
		}));
	}

	function sanitizeNomination(nomination: DraggableAwardNomination): AwardNomination {
		return {
			teamId: nomination.teamId,
			judgeGroupId: nomination.judgeGroupId
		};
	}

	function restoreLocalDragState() {
		editing = nominationsFromServer();
		removeWellItems = [];
	}

	// Dialog state
	let showAddDialog = $state(false);

	// Drag and drop functionality for judged awards
	const flipDurationMs = 200;

	function handleConsider(e: DropEvent) {
		editing = e.detail.items;
	}

	function handleFinalize(e: DropEvent) {
		if (e.detail.info.trigger !== TRIGGERS.DROPPED_INTO_ZONE) {
			restoreLocalDragState();
			return;
		}

		const movedNomination = e.detail.items.find((nomination) => nomination.id === e.detail.info.id);
		if (!movedNomination) {
			restoreLocalDragState();
			return;
		}

		editing = e.detail.items;
		onDrop?.({
			sourceAwardName: movedNomination.sourceAwardName,
			targetAward: award,
			movedNomination: sanitizeNomination(movedNomination),
			targetNominations: e.detail.items.map(sanitizeNomination)
		});
	}

	function handleRemoveWellConsider(e: DropEvent) {
		removeWellItems = e.detail.info.trigger === TRIGGERS.DRAG_STOPPED ? [] : e.detail.items;
	}

	function handleRemoveWellFinalize(e: DropEvent) {
		const movedNomination = e.detail.items.find((nomination) => nomination.id === e.detail.info.id);
		removeWellItems = [];
		if (e.detail.info.trigger === TRIGGERS.DROPPED_INTO_ZONE && movedNomination?.sourceAwardName === award.name) {
			onDrop?.({
				sourceAwardName: movedNomination.sourceAwardName,
				targetAward: null,
				movedNomination: sanitizeNomination(movedNomination)
			});
		}
	}

	// Dialog handler functions
	function handleAddNominationClick() {
		showAddDialog = true;
	}

	function handleDialogClose() {
		showAddDialog = false;
	}

	function handleDialogConfirm(teamId: string, showAbsent: boolean, bypassRequirements: boolean) {
		onAddNomination?.(award.name, teamId);
		showAddDialog = false;
	}

	// Teams already on this list, plus Excellence nominees when adding to Design.
	let absentTeamIds = $derived.by(() => {
		const ids = new Set(editing.map((nom) => nom.teamId));
		if (isDesignAward(award.name)) {
			const excellenceName = getPairedExcellenceAwardName(award.name);
			for (const nom of allFinalAwardNominations[excellenceName] ?? []) {
				ids.add(nom.teamId);
			}
		}
		return ids;
	});

	// Create a map of team eligibility status for Excellence Awards
	const teamEligibilityMap = $derived.by(() => {
		if (!teamEligibilities) return new Map<string, boolean>();

		const map = new Map<string, boolean>();
		for (const team of teamEligibilities) {
			map.set(team.teamNumber, team.isEligible);
		}
		return map;
	});

	// Create a map of team auto skills scores for Think Award
	const teamAutoSkillsMap = $derived.by(() => {
		if (!teamEligibilities) return new Map<string, number>();

		const map = new Map<string, number>();
		for (const team of teamEligibilities) {
			map.set(team.teamNumber, team.autoSkills.score);
		}
		return map;
	});

	function getExcellenceAwardEligibilityStatus(teamNumber: string): 'eligible' | 'ineligible' | 'no-data' {
		if (!teamEligibilities) return 'no-data';
		if (isDesignAward(award.name) || isExcellenceAward(award.name)) {
			if (!teamEligibilityMap.has(teamNumber)) return 'no-data';
			else return teamEligibilityMap.get(teamNumber) ? 'eligible' : 'ineligible';
		} else {
			return 'no-data';
		}
	}

	function getThinkAwardEligibilityStatus(teamNumber: string): 'eligible' | 'ineligible' | 'no-data' {
		if (!teamEligibilities) return 'no-data';
		if (award.name === 'Think Award') {
			if (!teamAutoSkillsMap.has(teamNumber)) return 'no-data';
			const autoSkillsScore = teamAutoSkillsMap.get(teamNumber) ?? 0;
			return autoSkillsScore > 0 ? 'eligible' : 'ineligible';
		}
		return 'no-data';
	}

	function getEligibilityStatus(teamNumber: string): 'eligible' | 'ineligible' | 'no-data' {
		if (isExcellenceAward(award.name)) {
			return getExcellenceAwardEligibilityStatus(teamNumber);
		}
		if (award.name === 'Think Award') {
			return getThinkAwardEligibilityStatus(teamNumber);
		}
		return 'eligible';
	}
</script>

<div class="flex max-w-40 min-w-40 flex-col gap-1">
	<div class="flex min-h-14 flex-col items-center justify-center p-2 text-center">
		<div class="min-h-12 max-w-full wrap-break-word">
			{award.name}
		</div>
		<div class="text-xs text-gray-500">
			{m.winners_count({ winners: winners.length, winnersCount: award.winnersCount })}
		</div>
	</div>
	<div class="relative">
		<div
			class="flex min-h-18 flex-col gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-1"
			use:dndzone={{
				items: editing,
				flipDurationMs,
				dropTargetStyle: { border: '1px solid #3B82F6' },
				dropFromOthersDisabled: dropFromOthersDisabled,
				type: usedZone,
				delayTouchStart: true
			}}
			onconsider={(e) => handleConsider(e)}
			onfinalize={(e) => handleFinalize(e)}
		>
			{#each editing as nom, index (nom.id)}
				{@const team = allTeams[nom.teamId]}
				{@const isWinner = winners.includes(nom.teamId)}
				{@const isBeforeLastWinner = winners.length > 0 && editingTeamIds.indexOf(winners[winners.length - 1]) > index}
				{@const isSkipped = !isWinner && isBeforeLastWinner}
				<!-- legacy code: not sure the reason of checking team existence here -->
				{@const excellenceAwardEligibilityStatus = team ? getExcellenceAwardEligibilityStatus(team.number) : 'no-data'}
				{@const thinkAwardEligibilityStatus = team ? getThinkAwardEligibilityStatus(team.number) : 'no-data'}
				{@const eligibilityStatus = team ? getEligibilityStatus(team.number) : 'no-data'}
				<div animate:flip={{ duration: flipDurationMs }}>
					<AwardNominationComponent
						{team}
						judgeGroup={nom.judgeGroupId ? allJudgeGroups[nom.judgeGroupId] : null}
						{isWinner}
						{isSkipped}
						{excellenceAwardEligibilityStatus}
						{thinkAwardEligibilityStatus}
						{eligibilityStatus}
					/>
				</div>
			{/each}
		</div>
		{#if editing.length === 0}
			<div class="absolute top-0 right-0 bottom-0 left-0 flex h-full min-h-10 items-center justify-center text-gray-500">
				<p class="text-sm">{m.no_nominations_yet()}</p>
			</div>
		{/if}
	</div>
	{#if !isExcellenceAward(award.name)}
		<div class="relative">
			<div
				class="h-8 overflow-hidden rounded-md border border-dashed border-gray-200"
				aria-label={m.remove_final_nomination()}
				use:dndzone={{
					items: removeWellItems,
					flipDurationMs,
					dropTargetStyle: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
					dropAnimationDisabled: true,
					type: usedZone,
					delayTouchStart: true
				}}
				onconsider={handleRemoveWellConsider}
				onfinalize={handleRemoveWellFinalize}
			>
				{#each removeWellItems as item (item.id)}
					<div class="h-full"></div>
				{/each}
			</div>
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400">
				<TrashBinIcon />
			</div>
		</div>
	{/if}
	<div>
		{#if showAddButton}
			<button
				onclick={handleAddNominationClick}
				class="w-full border-gray-300 text-center text-sm text-slate-600 underline hover:text-slate-800">{m.add_nomination_button()}</button
			>
		{/if}
	</div>
</div>

<!-- Add Nomination Dialog -->
<AddNominationDialog open={showAddDialog} {award} {allTeams} {absentTeamIds} onClose={handleDialogClose} onConfirm={handleDialogConfirm} />
