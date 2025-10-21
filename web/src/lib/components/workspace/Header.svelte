<script lang="ts">
	import { app } from '$lib/index.svelte';
	import ConnectionStatusIndicator from './ConnectionStatusIndicator.svelte';
	import UserMenu from './UserMenu.svelte';

	interface Props {
		// onClickShareJudgesRoom: () => void;
	}

	// let { onClickShareJudgesRoom: onShareJudgesRoom }: Props = $props();

	const currentUser = $derived(app.getCurrentUser());

	// Get judge group name for display
	const judgeGroupName = $derived(() => {
		if (!app.hasEssentialData() || !currentUser || currentUser.role === 'judge_advisor') return null;
		if (currentUser.role === 'judge') {
			const group = app.findJudgeGroupByJudgeId(currentUser.judge.id);
			return group?.name || null;
		}
		return null;
	});
</script>

<header class="bg-slate-200 px-2 py-2 md:px-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div>
				<h1 class="text-xl font-semibold text-gray-900">
					{app.getEventName() || 'Judging Judges\' Room'}
				</h1>
				<div class="flex items-center space-x-2 text-sm text-gray-500">
					{#if currentUser?.role === 'judge_advisor'}
						<span>Judge Advisor</span>
					{:else if currentUser && currentUser.role === 'judge'}
						<span>{currentUser.judge.name || 'Unknown'}</span>
						<span>•</span>
						<span>{judgeGroupName()}</span>
					{:else}
						<span>Unknown</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex items-center space-x-4">
			<ConnectionStatusIndicator />
			<UserMenu />
		</div>
	</div>
</header>
