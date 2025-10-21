<script lang="ts">
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';
	import type { Judge } from '@judgesroom.com/protocol/src/judging';

	interface Props {
		judge: Judge;
		onRemoveJudge: (judgeId: string) => void;
	}

	let { judge, onRemoveJudge }: Props = $props();
</script>

<div class="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2">
	<span class="text-sm font-medium text-gray-900">{judge.name}</span>
	<button
		onclick={() => onRemoveJudge(judge.id)}
		class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
		title="Remove judge"
	>
		<TrashBinIcon class="h-3 w-3" />
	</button>
</div>
