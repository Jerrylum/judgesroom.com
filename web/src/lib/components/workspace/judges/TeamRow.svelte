<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { dialogs } from '$lib/index.svelte';
	import NotebookIcon from '$lib/icon/NotebookIcon.svelte';
	import ChatIcon from '$lib/icon/ChatIcon.svelte';
	import ReassignTeamDialog from './ReassignTeamDialog.svelte';
	import RowOverflowMenu from './RowOverflowMenu.svelte';

	interface Props {
		teamId: string;
		teamNumber: string;
		teamName: string;
		groupId: string;
		notebookDone: boolean;
		interviewDone: boolean;
		canReassign: boolean;
	}

	let { teamId, teamNumber, teamName, groupId, notebookDone, interviewDone, canReassign }: Props = $props();

	const teamLabel = $derived(`${teamNumber} · ${teamName}`);

	async function reassignTeam() {
		await dialogs.showCustom(ReassignTeamDialog, {
			props: {
				teamId,
				teamLabel,
				currentGroupId: groupId
			},
			maxWidth: 'max-w-md'
		});
	}
</script>

<div class="team-info relative min-h-19 rounded border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
	<div class={canReassign ? 'pr-8' : ''}>
		<div class="text-sm font-medium text-gray-900">{teamNumber}</div>
		<div class="truncate text-xs text-gray-600">{teamName}</div>
		<div class="mt-2 flex items-center gap-2">
			<span
				class="inline-flex"
				class:text-green-600={notebookDone}
				class:text-gray-300={!notebookDone}
				title={notebookDone ? m.notebook_done() : m.not_done()}
			>
				<NotebookIcon size={14} />
			</span>
			<span
				class="inline-flex"
				class:text-green-600={interviewDone}
				class:text-gray-300={!interviewDone}
				title={interviewDone ? m.interview_done() : m.not_done()}
			>
				<ChatIcon size={14} />
			</span>
		</div>
	</div>
	{#if canReassign}
		<div class="absolute top-1 right-1">
			<RowOverflowMenu>
				{#snippet children({ close })}
					<button
						type="button"
						role="menuitem"
						class="block text-gray-800"
						onclick={() => {
							close();
							void reassignTeam();
						}}
					>
						{m.reassign_team()}
					</button>
				{/snippet}
			</RowOverflowMenu>
		</div>
	{/if}
</div>
