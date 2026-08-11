<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, dialogs } from '$lib/index.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import type { JudgeGroup } from '@judgesroom.com/protocol/src/judging';

	interface Props {
		teamId: string;
		teamLabel: string;
		currentGroupId: string;
	}

	let { teamId, teamLabel, currentGroupId }: Props = $props();

	const otherGroups = $derived(
		app.getAllJudgeGroups().filter((group: JudgeGroup) => group.id !== currentGroupId)
	);
	let selectedGroupId = $state<string | null>(null);
	const effectiveGroupId = $derived(
		selectedGroupId && otherGroups.some((group) => group.id === selectedGroupId)
			? selectedGroupId
			: (otherGroups[0]?.id ?? '')
	);

	async function handleConfirm() {
		if (!effectiveGroupId) return;
		try {
			await app.wrpcClient.essential.reassignTeam.mutation({
				teamId,
				toJudgeGroupId: effectiveGroupId
			});
			dialogs.closeDialog(true);
		} catch (error) {
			console.error('Failed to reassign team:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}

	function handleCancel() {
		dialogs.closeDialog(false);
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-md p-4!">
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">{m.reassign_team_title()}</h3>
	<p class="mb-4 text-sm text-gray-600">{m.reassign_team_message({ team: teamLabel })}</p>

	{#if otherGroups.length === 0}
		<p class="mb-6 text-sm text-gray-500">{m.no_other_judge_groups()}</p>
	{:else}
		<label class="mb-2 block text-sm font-medium text-gray-700" for="reassign-group">
			{m.reassign_team_select_group()}
		</label>
		<select
			id="reassign-group"
			class="classic mb-6 block w-full"
			value={effectiveGroupId}
			onchange={(event) => {
				selectedGroupId = (event.currentTarget as HTMLSelectElement).value;
			}}
		>
			{#each otherGroups as group (group.id)}
				<option value={group.id}>{group.name}</option>
			{/each}
		</select>
	{/if}

	<div class="flex justify-end space-x-3">
		<button type="button" onclick={handleCancel} class="secondary">{m.cancel()}</button>
		<button type="button" onclick={handleConfirm} class="primary" disabled={!effectiveGroupId || otherGroups.length === 0}>
			{m.reassign_team()}
		</button>
	</div>
</Dialog>
