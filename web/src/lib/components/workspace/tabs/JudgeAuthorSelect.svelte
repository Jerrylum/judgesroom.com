<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app } from '$lib/index.svelte';

	interface Props {
		judgeId: string | null;
		disabled?: boolean;
		id?: string;
	}

	let { judgeId = $bindable(null), disabled = false, id = 'judge-author-select' }: Props = $props();

	const judgeGroups = $derived(app.getAllJudgeGroups());
	const judgesByGroup = $derived(app.getExistingJudgesGroupedByGroup());

	function handleChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		judgeId = value || null;
	}
</script>

<div>
	<label for={id} class="mb-2 block text-sm font-medium text-gray-700"><strong>{m.judge_name_colon()}</strong></label>
	<select {id} class="classic mt-1 block w-full" value={judgeId ?? ''} {disabled} onchange={handleChange}>
		<option value="">{m.select_a_judge()}</option>
		{#each judgeGroups as group (group.id)}
			{@const judges = judgesByGroup[group.id] ?? []}
			{#if judges.length > 0}
				<optgroup label={group.name}>
					{#each judges as judge (judge.id)}
						<option value={judge.id}>{judge.name}</option>
					{/each}
				</optgroup>
			{/if}
		{/each}
	</select>
</div>
