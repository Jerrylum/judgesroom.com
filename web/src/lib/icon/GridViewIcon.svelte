<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 14, class: className = '' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class={className}>
	<path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
</svg>
