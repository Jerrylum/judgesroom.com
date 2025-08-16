<script lang="ts">
	import type { AwardOptions } from '$lib/awards.svelte';

	type AwardOptionsWithId = AwardOptions & { id: string };

	interface Props {
		award: AwardOptionsWithId;
	}

	let { award = $bindable() }: Props = $props();

	const colorClasses = {
		performance: {
			bg: 'bg-slate-300',
			border: 'border-slate-500',
			text: 'text-slate-900',
			focus: 'focus:border-slate-800 focus:ring-slate-800',
			checkbox: 'text-slate-800 focus:ring-slate-800'
		},
		judged: {
			bg: 'bg-slate-300',
			border: 'border-slate-500',
			text: 'text-slate-900',
			focus: 'focus:border-slate-800 focus:ring-slate-800',
			checkbox: 'text-slate-800 focus:ring-slate-800'
		},
		volunteer_nominated: {
			bg: 'bg-slate-300',
			border: 'border-slate-500',
			text: 'text-slate-900',
			focus: 'focus:border-slate-800 focus:ring-slate-800',
			checkbox: 'text-slate-800 focus:ring-slate-800'
		}
	};

	// Most of the props are undefined when the award is a shadow item
	const colors = $derived(colorClasses[award.selectedType] ?? colorClasses['performance']);
</script>

{#if 'isDndShadowItem' in award}
	<div
		class="flex min-h-15 cursor-move flex-row items-center justify-between rounded-lg border p-4 pr-1 opacity-5 transition-all duration-200 hover:shadow-md"
	></div>
{:else}
	<div
		class="flex min-h-15 cursor-move flex-row items-center justify-between rounded-lg p-4 pr-1 transition-all duration-200 hover:shadow-md {colors.bg} {colors.border} border"
		class:opacity-40={!award.isSelected}
		class:opacity-100={award.isSelected}
	>
		<div class="flex flex-1 items-center justify-between gap-4">
			<!-- Left side: Large checkbox -->
			<label class="flex cursor-pointer items-center">
				<input
					type="checkbox"
					bind:checked={award.isSelected}
					class="h-5 w-5 rounded border-gray-300 {colors.checkbox}"
				/>
				<span class="sr-only">Select {award.name} award</span>
			</label>

			<!-- Center: Award name -->
			<div class="flex-1">
				<h4 class="font-medium {colors.text} text-sm">{award.name}</h4>
				<!-- <div class="flex items-center gap-2">
					<h4 class="font-medium {colors.text} text-sm">{award.name}</h4>
					{#if award.requireNotebook}
						<span
							class="rounded-sm px-1 py-0.5 text-xs font-medium text-blue-800"
							title="Notebook required"
						>
							📓
						</span>
					{/if}
				</div> -->
				{#if !award.isOfficial}
					<span class="text-xs text-gray-500 italic">Custom Award</span>
				{/if}
			</div>

			<!-- Right side: Winner count (small) -->
			{#if award.isSelected}
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-0">
						<span class="text-xs text-gray-500">x</span>
						<input
							type="number"
							bind:value={award.possibleWinners}
							min="1"
							class="w-10 rounded border-gray-300 px-0 py-1 text-xs {colors.focus} text-center"
							title="Number of winners"
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
