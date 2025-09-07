<script lang="ts">
	import type { Team } from '$lib/team.svelte';
	import TeamImport from './TeamImport.svelte';

	interface Props {
		teams: Team[];
		onNext: () => void;
		onPrev: () => void;
	}

	let { teams = $bindable(), onNext, onPrev }: Props = $props();
</script>

<div class="space-y-6">
	<TeamImport bind:teams />

	<div class="flex justify-between pt-6">
		<button onclick={onPrev} class="secondary">Back</button>
		<button onclick={onNext} class="primary">Next: Judge Setup</button>
	</div>
</div>
