<script lang="ts">
	import type { Snippet } from 'svelte';
	import WarningIcon from '$lib/icon/WarningIcon.svelte';

	interface Props {
		title: string;
		children?: Snippet;
	}

	// children is a string or HTMLParagraphElement[]

	let { title, children }: Props = $props();
</script>

<div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
	<div class="flex">
		<div class="shrink-0">
			<WarningIcon />
		</div>
		<div class="ml-3">
			<h3 class="text-sm font-medium text-yellow-800">{title}</h3>
			<div class="mt-2 text-sm text-yellow-700">
				{@render children?.()}
			</div>
		</div>
	</div>
</div>
