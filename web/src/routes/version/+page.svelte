<script lang="ts">
	import { app } from "$lib/index.svelte";
</script>

<svelte:head>
	<title>Version {app.version} | Judges' Room</title>
</svelte:head>

<div class="min-h-screen">
	<div class="flex h-screen flex-col bg-slate-100">
		<div class="flex flex-1 flex-col items-center justify-center p-8">
			<h1 class="text-4xl font-bold">Version {app.version}</h1>
		</div>
	</div>
</div>
