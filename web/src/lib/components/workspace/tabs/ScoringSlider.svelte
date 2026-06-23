<script lang="ts">
	import { formatRubricScore } from '@judgesroom.com/protocol/src/rubric';

	let {
		variable = $bindable(),
		max,
		step = 0.1,
		showError
	}: {
		variable: number;
		max: number;
		step?: number;
		showError: boolean;
	} = $props();

	const sliderValue = $derived(variable === -1 ? 0 : variable);
	const displayValue = $derived(variable === -1 ? '—' : formatRubricScore(variable));
	const hasError = $derived(showError && variable === -1);

	function onInput(event: Event) {
		const target = event.target as HTMLInputElement;
		variable = Math.round(parseFloat(target.value) * 10) / 10;
	}
</script>

<div class="flex w-full flex-col items-center gap-1 px-1">
	<span class="text-base font-semibold tabular-nums" class:text-red-600={hasError}>{displayValue}</span>
	<input
		type="range"
		class="w-full accent-slate-700"
		min="0"
		{max}
		{step}
		value={sliderValue}
		disabled={false}
		oninput={onInput}
		aria-label="Points"
	/>
	<span class="text-[10px] text-gray-500 tabular-nums">0–{formatRubricScore(max)}</span>
</div>
