<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isActive: boolean;
		tabId: string;
		children: Snippet;
	}

	let { isActive, tabId, children }: Props = $props();
</script>

<div class="tab-content h-full w-full" class:hidden={!isActive} data-tab-id={tabId}>
	{@render children()}
</div>
