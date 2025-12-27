<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { AwardOptions } from '$lib/award.svelte';

	interface Props {
		award: AwardOptions;
	}

	let { award = $bindable() }: Props = $props();
</script>

<div
	class="min-h-15 flex flex-row items-center justify-between rounded-lg border border-slate-500 bg-slate-300 p-4 pr-1 transition-all duration-200 hover:shadow-md"
	class:opacity-40={!award.isSelected}
	class:opacity-100={award.isSelected}
>
	<div class="flex flex-1 items-center justify-between gap-4">
		<!-- Left side: Large checkbox -->
		<label class="flex cursor-pointer items-center">
			<input
				type="checkbox"
				bind:checked={award.isSelected}
				disabled
				class="h-5 w-5 rounded border-gray-300 text-slate-800 focus:ring-slate-800"
			/>
			<span class="sr-only">{m.select_award({ award: award.name })}</span>
		</label>

		<!-- Center: Award name -->
		<div class="flex-1">
			<h4 class="text-sm font-medium text-slate-900">{award.name}</h4>
			{#if !award.isOfficial}
				<span class="text-xs italic text-gray-500">{m.custom_award()}</span>
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
						disabled
						min="1"
						class="w-10 rounded border-gray-300 px-0 py-1 text-center text-xs focus:border-slate-800 focus:ring-slate-800"
						title={m.number_of_winners()}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
