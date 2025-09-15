<script lang="ts">
	import AwardOptionsComponent from './AwardOptions.svelte';
	import CustomAwardDialog from './CustomAwardDialog.svelte';
	import { dialogs } from '$lib/app-page.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import type { AwardOptions } from '$lib/award.svelte';
	import type { CompetitionType, Grade } from '@judging.jerryio/protocol/src/award';

	// Extended AwardOptions type for drag and drop
	type AwardOptionsWithId = AwardOptions & { id: string };

	interface Props {
		selectedCompetitionType: CompetitionType;
		possibleGrades: Grade[];
		performanceAwards: AwardOptionsWithId[];
		judgedAwards: AwardOptionsWithId[];
		volunteerNominatedAwards: AwardOptionsWithId[];
		onNext: () => void;
		onPrev: () => void;
	}

	let {
		selectedCompetitionType,
		possibleGrades,
		performanceAwards = $bindable(),
		judgedAwards = $bindable(),
		volunteerNominatedAwards = $bindable(),
		onNext,
		onPrev
	}: Props = $props();

	function handleDndConsiderCards(e: CustomEvent<{ items: AwardOptionsWithId[] }>, listType: 'performance' | 'judged' | 'volunteer') {
		if (listType === 'performance') {
			performanceAwards = e.detail.items;
		} else if (listType === 'judged') {
			judgedAwards = e.detail.items;
		} else {
			volunteerNominatedAwards = e.detail.items;
		}
	}

	function handleDndFinalizeCards(e: CustomEvent<{ items: AwardOptionsWithId[] }>, listType: 'performance' | 'judged' | 'volunteer') {
		if (listType === 'performance') {
			performanceAwards = e.detail.items;
		} else if (listType === 'judged') {
			judgedAwards = e.detail.items;
		} else {
			volunteerNominatedAwards = e.detail.items;
		}
	}

	async function openCustomAwardDialog() {
		const result = await dialogs.showCustom(CustomAwardDialog, {
			props: {
				existingAwards: [...performanceAwards, ...judgedAwards, ...volunteerNominatedAwards],
				selectedCompetitionType,
				possibleGrades
			}
		});

		// If user didn't cancel, add the award to the appropriate list
		const customAwardWithId = result as AwardOptionsWithId | null;
		if (customAwardWithId) {
			if (customAwardWithId.selectedType === 'performance') {
				performanceAwards = [...performanceAwards, customAwardWithId];
			} else if (customAwardWithId.selectedType === 'judged') {
				judgedAwards = [...judgedAwards, customAwardWithId];
			} else {
				volunteerNominatedAwards = [...volunteerNominatedAwards, customAwardWithId];
			}
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold text-gray-900">Award Selection</h2>
		<button onclick={openCustomAwardDialog} class="success tiny">+ Add Custom Award</button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Performance Awards -->
		<div class="space-y-3">
			<div>
				<h3 class="text-base font-semibold text-gray-800">Performance Awards</h3>
				<p class="mb-3 text-xs text-gray-600">
					Based on robot performance in matches and skills challenges. Default order follows Qualifying Criteria precedence &lt;AW1&gt;.
					Drag to reorder if needed.
				</p>
			</div>
			<div
				class="min-h-[300px] space-y-2 border-t pt-3"
				use:dndzone={{
					items: performanceAwards,
					flipDurationMs: 200,
					dropTargetStyle: { outline: '1px solid #EEE' },
					type: 'performance'
				}}
				onconsider={(e) => handleDndConsiderCards(e, 'performance')}
				onfinalize={(e) => handleDndFinalizeCards(e, 'performance')}
			>
				{#each performanceAwards as award, index (award.id)}
					<div animate:flip={{ duration: 200 }}>
						<AwardOptionsComponent bind:award={performanceAwards[index]} />
					</div>
				{/each}
			</div>
		</div>

		<!-- Judged Awards -->
		<div class="space-y-3">
			<div>
				<h3 class="text-base font-semibold text-gray-800">Judged Awards</h3>
				<p class="mb-3 text-xs text-gray-600">
					Determined by judges based on award criteria. Default order follows Qualifying Criteria precedence &lt;AW2&gt;. Drag to reorder if
					needed.
				</p>
			</div>
			<div
				class="min-h-[300px] space-y-2 border-t pt-3"
				use:dndzone={{
					items: judgedAwards,
					flipDurationMs: 200,
					dropTargetStyle: { outline: '1px solid #EEE' },
					type: 'others'
				}}
				onconsider={(e) => handleDndConsiderCards(e, 'judged')}
				onfinalize={(e) => handleDndFinalizeCards(e, 'judged')}
			>
				{#each judgedAwards as award, index (award.id)}
					<div animate:flip={{ duration: 200 }}>
						<AwardOptionsComponent bind:award={judgedAwards[index]} />
					</div>
				{/each}
			</div>
		</div>

		<!-- Volunteer Nominated Awards -->
		<div class="space-y-3">
			<div>
				<h3 class="text-base font-semibold text-gray-800">Volunteer Nominated Awards</h3>
				<p class="mb-3 text-xs text-gray-600">
					Determined by volunteer staff and not by Judges. Sportsmapship Award and Energy Award can be dragged to this section.
				</p>
			</div>
			<div
				class="min-h-[300px] space-y-2 border-t pt-3"
				use:dndzone={{
					items: volunteerNominatedAwards,
					flipDurationMs: 200,
					dropTargetStyle: { outline: '1px solid #EEE' },
					type: 'others'
				}}
				onconsider={(e) => handleDndConsiderCards(e, 'volunteer')}
				onfinalize={(e) => handleDndFinalizeCards(e, 'volunteer')}
			>
				{#each volunteerNominatedAwards as award, index (award.id)}
					<div animate:flip={{ duration: 200 }}>
						<AwardOptionsComponent bind:award={volunteerNominatedAwards[index]} />
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="flex justify-between pt-4">
		<button onclick={onPrev} class="secondary">Back</button>
		<button onclick={onNext} class="primary">Next: Team Import</button>
	</div>
</div>
