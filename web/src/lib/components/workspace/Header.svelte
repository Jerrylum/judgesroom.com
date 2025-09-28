<script lang="ts">
	import { app } from '$lib/app-page.svelte';
	import ConnectionStatusIndicator from './ConnectionStatusIndicator.svelte';
	import UserMenu from './UserMenu.svelte';

	interface Props {
		// onClickShareSession: () => void;
	}

	// let { onClickShareSession: onShareSession }: Props = $props();

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

<header class="border-b bg-white px-6 py-4 shadow-sm">
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div>
				<h1 class="text-xl font-semibold text-gray-900">
					{app.getEventName() || 'Judging Session'}
				</h1>
				<div class="flex items-center space-x-2 text-sm text-gray-500">
					{#if currentUser?.role === 'judge_advisor'}
						<span> Judge Advisor</span>
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
			<!-- Connection Status -->
			<ConnectionStatusIndicator />

			<!-- Share Session Button -->
			<!-- <button
				onclick={onShareSession}
				class="flex items-center space-x-2 rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 sm:space-x-2"
			>
				<ShareIcon />
				<span>Share</span>
			</button> -->

			<!-- User Menu -->
			<UserMenu />
		</div>
	</div>
</header>
