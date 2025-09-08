<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isActive: boolean;
		tabId: string;
		tabType: string;
		children: Snippet;
	}

	let { isActive, tabId, tabType, children }: Props = $props();
</script>

{#if isActive}
	<div class="tab-content h-full w-full" data-tab-id={tabId} data-tab-type={tabType}>
		{@render children()}
	</div>
{/if}
