<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import AwardOptionsComponent from './AwardOptions.svelte';
	import type { AwardOptions } from '$lib/award.svelte';
	import type { AwardType } from '@judging.jerryio/protocol/src/award';

	interface Props {
		type: AwardType;
		zone?: string;
		awardOptions: AwardOptions[];
		onConsider?: (type: AwardType, zone: string, e: DropEvent) => void;
		onFinalize?: (type: AwardType, zone: string, e: DropEvent) => void;
	}

	type DropEvent = CustomEvent<{ items: AwardOptions[] }>;

	let { type, zone, awardOptions = $bindable(), onConsider, onFinalize }: Props = $props();

	let usedZone = $derived(zone ?? 'others');
	let editing = $state<AwardOptions[]>([]);

	$effect(() => {
		editing = [...awardOptions];
	});

	const flipDurationMs = 200;

	function handleConsider(e: DropEvent) {
		editing = e.detail.items;
		onConsider?.(type, usedZone, e);
	}

	function handleFinalize(e: DropEvent) {
		editing = e.detail.items;
		onFinalize?.(type, usedZone, e);
	}
</script>

<div
	class="min-h-30 space-y-2 rounded-lg"
	use:dndzone={{
		items: editing,
		flipDurationMs,
		dropTargetStyle: { outline: '1px solid #EEE' },
		type: usedZone,
		delayTouchStart: true
	}}
	onconsider={(e) => handleConsider(e)}
	onfinalize={(e) => handleFinalize(e)}
>
	{#each editing as award, index (award.id)}
		<div animate:flip={{ duration: flipDurationMs }}>
			<AwardOptionsComponent bind:award={editing[index]} />
		</div>
	{/each}
</div>
