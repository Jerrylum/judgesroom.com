<script lang="ts">
	let { variable = $bindable(), showError } = $props<{ variable: number; showError: boolean }>();
</script>

{#each [0, 1, 2, 3, 4, 5] as score (score)}
	<button
		class="flex h-6 w-6 flex-col items-center p-1 text-center hover:font-bold"
		class:font-bold={variable === score}
		class:underline={variable === score}
		class:text-red-600={showError && variable === -1}
		onclick={() => (variable = score)}
	>
		{score}
	</button>
{/each}
