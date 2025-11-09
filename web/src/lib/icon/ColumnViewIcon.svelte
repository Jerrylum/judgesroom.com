<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 14, class: className = '' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class={className}>
	<path d="M3 3h14v2H3V3zm0 4h14v2H3V7zm0 4h14v2H3v-2zm0 4h14v2H3v-2z" />
</svg>
