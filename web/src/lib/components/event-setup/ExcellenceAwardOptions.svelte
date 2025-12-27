<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { AwardOptions } from '$lib/award.svelte';

	interface Props {
		awards: AwardOptions[];
	}

	let { awards = $bindable() }: Props = $props();

	const isOneAward = $derived(awards[0].isSelected);
	const isMultiGrades = $derived(awards.length > 1);

	function onChange(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		if (value === '1') {
			for (let i = 0; i < awards.length; i++) {
				awards[i].isSelected = awards[i].name === 'Excellence Award';
			}
		} else {
			for (let i = 0; i < awards.length; i++) {
				awards[i].isSelected = awards[i].name !== 'Excellence Award';
			}
		}
	}
</script>

<div
	class="min-h-15 flex flex-row items-center justify-between rounded-lg border border-slate-500 bg-slate-300 p-4 pr-1 transition-all duration-200 hover:shadow-md"
>
	<div class="flex flex-1 items-center justify-between gap-4">
		<!-- Left side: Large checkbox -->
		<label class="flex cursor-pointer items-center">
			<input type="checkbox" checked={true} disabled class="h-5 w-5 rounded border-gray-300 text-slate-800 focus:ring-slate-800" />
			<span class="sr-only">{m.select_excellence_award_award()}</span>
		</label>

		<!-- Center: Award name -->
		<div class="flex-1">
			<h4 class="text-sm font-medium text-slate-900">Excellence Award</h4>
		</div>

		<!-- Right side: Winner count (small) -->
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-0">
				<span class="text-xs text-gray-500">x</span>
				<input
					type="number"
					value={isOneAward ? 1 : 2}
					min="1"
					max={isMultiGrades ? 2 : 1}
					onchange={onChange}
					class="w-10 rounded border-gray-300 px-0 py-1 text-center text-xs focus:border-slate-800 focus:ring-slate-800"
					title={m.number_of_winners()}
				/>
			</div>
		</div>
	</div>
</div>
