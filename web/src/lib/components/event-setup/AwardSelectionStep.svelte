<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import CustomAwardDialog from './CustomAwardDialog.svelte';
	import { dialogs } from '$lib/index.svelte';
	import { getOfficialAwardOptionsList, type AwardOptions } from '$lib/award.svelte';
	import { isExcellenceAward, type AwardType, type Program } from '@judgesroom.com/protocol/src/award';
	import type { EventGradeLevel } from '@judgesroom.com/protocol/src/event';
	import { getEventGradeLevelOptions } from '$lib/event.svelte';
	import FixedAwardOptions from './FixedAwardOptions.svelte';
	import ExcellenceAwardOptions from './ExcellenceAwardOptions.svelte';
	import AwardSelectionColumn from './AwardSelectionColumn.svelte';
	import { tick, untrack } from 'svelte';
	import { gtag } from '$lib/index.svelte';

	gtag('event', 'award_selection_step_loaded');

	interface Props {
		selectedProgram: Program;
		selectedEventGradeLevel: EventGradeLevel;
		allAwardOptions: AwardOptions[];
		onNext: () => void;
		onPrev: () => void;
	}

	type DropEvent = CustomEvent<{ items: AwardOptions[] }>;

	let { selectedProgram, selectedEventGradeLevel, allAwardOptions = $bindable(), onNext, onPrev }: Props = $props();

	const gradeOptions = $derived(getEventGradeLevelOptions(selectedProgram));
	const possibleGrades = $derived(gradeOptions.find((g) => g.value === selectedEventGradeLevel)?.grades ?? []);

	let excellenceAward = $state<AwardOptions[]>([]);
	let designAward = $state<AwardOptions | null>(null);
	let localState = $state<Record<AwardType, AwardOptions[]>>({
		performance: [],
		judged: [],
		volunteer_nominated: []
	});

	$effect(() => {
		let using = allAwardOptions;

		if (using.length === 0) {
			using = getOfficialAwardOptionsList(selectedProgram, possibleGrades);
		}

		untrack(() => {
			const j = using.filter((award) => award.selectedType === 'judged');
			excellenceAward = j.filter((award) => isExcellenceAward(award.name));
			designAward = j.find((award) => award.name === 'Design Award')!;
			localState = {
				performance: using.filter((award) => award.selectedType === 'performance'),
				judged: j.filter((award) => !isExcellenceAward(award.name) && award.name !== 'Design Award'),
				volunteer_nominated: using.filter((award) => award.selectedType === 'volunteer_nominated')
			};
		});
	});

	let dropOut = $state<{ type: AwardType; awardOptions: AwardOptions[] } | null>(null);
	let dragIn = $state<{ type: AwardType; awardOptions: AwardOptions[] } | null>(null);

	function commit(type: AwardType, awardOptions: AwardOptions[]) {
		awardOptions.forEach((ao) => {
			ao.selectedType = type;
		});

		localState[type] = awardOptions;
	}

	function rollback(type: AwardType) {
		// force all columns to rollback their editing state
		// IMPORTANT: to avoid rendering warnings, we need to wait for the next tick
		tick().then(() => {
			localState[type] = [...localState[type]];
		});
	}

	function isAwardSelectionValid(type: AwardType, awardOptions: AwardOptions[]): boolean {
		return awardOptions.every((ao) => ao.possibleTypes.includes(type));
	}

	function handleAwardOptionsFinalize(type: AwardType, zone: string, e: DropEvent) {
		if (zone === 'others') {
			const originalState = localState[type];
			const proposedState = e.detail.items;
			if (originalState.length === proposedState.length) {
				if (isAwardSelectionValid(type, proposedState)) {
					commit(type, proposedState);
				} else {
					rollback(type);
				}
				return;
			} else if (originalState.length > proposedState.length) {
				dropOut = { type, awardOptions: proposedState };
			} else {
				dragIn = { type, awardOptions: proposedState };
			}

			if (dropOut && dragIn) {
				if (isAwardSelectionValid(dragIn.type, dragIn.awardOptions) && isAwardSelectionValid(dropOut.type, dropOut.awardOptions)) {
					commit(dragIn.type, dragIn.awardOptions);
					commit(dropOut.type, dropOut.awardOptions);
				} else {
					rollback(dragIn.type);
					rollback(dropOut.type);
				}
				dropOut = null;
				dragIn = null;
			}
		} else {
			if (isAwardSelectionValid(type, e.detail.items)) {
				commit(type, e.detail.items);
			} else {
				rollback(type);
			}
		}
	}

	async function openCustomAwardDialog() {
		const result = await dialogs.showCustom(CustomAwardDialog, {
			props: {
				existingAwards: [...allAwardOptions],
				selectedProgram,
				possibleGrades
			}
		});

		// If user didn't cancel, add the award to the appropriate list
		const customAward = result as AwardOptions | null;
		if (customAward) {
			if (customAward.selectedType === 'performance') {
				localState.performance.push(customAward);
			} else if (customAward.selectedType === 'judged') {
				localState.judged.push(customAward);
			} else {
				localState.volunteer_nominated.push(customAward);
			}
		}
	}

	function submit() {
		allAwardOptions = [
			...localState.performance,
			...excellenceAward,
			designAward!,
			...localState.judged,
			...localState.volunteer_nominated
		];
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold text-gray-900">{m.awards_setup()}</h2>
		<button onclick={openCustomAwardDialog} class="success tiny">{m.add_custom_award()}</button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Performance Awards -->
		<div class="space-y-3">
			<div>
				<h3 class="text-base font-semibold text-gray-800">{m.performance_awards()}</h3>
				<p class="mb-3 text-xs text-gray-600">
					{m.performance_awards_description()}
				</p>
			</div>
			<div class="space-y-2 border-t pt-3">
				<AwardSelectionColumn
					type="performance"
					zone="performance"
					awardOptions={localState.performance}
					onFinalize={handleAwardOptionsFinalize}
				/>
			</div>
		</div>

		<!-- Judged Awards -->
		<div class="space-y-3">
			<div>
				<h3 class="text-base font-semibold text-gray-800">{m.judged_awards()}</h3>
				<p class="mb-3 text-xs text-gray-600">
					{m.judged_awards_description()}
				</p>
			</div>
			<div class="space-y-2 border-t pt-3">
				{#if excellenceAward.length > 0}
					<ExcellenceAwardOptions bind:awards={excellenceAward} />
				{/if}
				{#if designAward}
					<FixedAwardOptions bind:award={designAward} />
				{/if}
				<AwardSelectionColumn type="judged" zone="others" awardOptions={localState.judged} onFinalize={handleAwardOptionsFinalize} />
			</div>
		</div>

		<!-- Volunteer Nominated Awards -->
		<div class="space-y-3">
			<div>
				<h3 class="text-base font-semibold text-gray-800">{m.volunteer_nominated_awards()}</h3>
				<p class="mb-3 text-xs text-gray-600">
					{m.volunteer_nominated_awards_description()}
				</p>
			</div>
			<div class="space-y-2 border-t pt-3">
				<AwardSelectionColumn
					type="volunteer_nominated"
					zone="others"
					awardOptions={localState.volunteer_nominated}
					onFinalize={handleAwardOptionsFinalize}
				/>
			</div>
		</div>
	</div>

	<div class="flex justify-between pt-4">
		<button
			onclick={() => {
				submit();
				onPrev();
			}}
			class="secondary">{m.back()}</button
		>
		<button
			onclick={() => {
				submit();
				onNext();
			}}
			class="primary">{m.next_review()}</button
		>
	</div>
</div>
