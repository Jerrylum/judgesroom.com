<script lang="ts">
	import type { Notice } from '$lib/app.svelte';

	interface Props {
		notice: Notice;
		dismissNotice: (id: string) => void;
	}

	let { notice, dismissNotice }: Props = $props();
	const isError = $derived(notice.type === 'error');
</script>

<div
	class="min-w-xs max-w-9/10 flex items-center justify-between rounded-lg p-4 shadow-lg {isError
		? 'bg-red-100 text-red-700'
		: 'bg-green-100 text-green-700'}"
>
	<div class="flex items-center">
		{#if isError}
			<svg class="mr-2 h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
		{:else}
			<svg class="mr-2 h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
			</svg>
		{/if}
		<span class="text-sm">{notice.message}</span>
	</div>
	<button
		onclick={() => dismissNotice(notice.id)}
		class="ml-2 rounded-full p-1 {isError ? 'hover:bg-red-200' : 'hover:bg-green-200'}"
		aria-label="Dismiss notice"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
		</svg>
	</button>
</div>
