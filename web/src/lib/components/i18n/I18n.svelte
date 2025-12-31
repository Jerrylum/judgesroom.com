<script lang="ts">
  import { getLocale } from '$lib/paraglide/runtime';
</script>

<svelte:head>
	{#if getLocale() === 'zh-hk'}
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
		<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@100..900&display=swap" rel="stylesheet" />
		<style>
			body {
				font-family: 'Noto Sans HK', sans-serif;
			}
		</style>
	{/if}
</svelte:head>
