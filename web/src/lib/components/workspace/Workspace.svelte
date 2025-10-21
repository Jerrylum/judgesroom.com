<script lang="ts">
	import { app, subscriptions, tabs, dialogs } from '$lib/index.svelte';
	import Header from './Header.svelte';
	import TabBar from './TabBar.svelte';
	import type { AwardRankingsFullUpdate, SubmissionCache } from '@judging.jerryio/protocol/src/rubric';
	import type { Tab } from '$lib/tab.svelte';

	// Get tab state
	const allTabs = $derived(tabs.allTabs);
	const activeTabId = $derived(tabs.activeTab);
	const activeTab = $derived(activeTabId ? tabs.getTab(activeTabId) : null);
	const isJudgingReady = $derived(app.isJudgingReady());
	const currentJudgeGroupId = $derived(app.getCurrentUserJudgeGroup()?.id ?? null);
	const isViewingAwardNominationTab = $derived(activeTab?.type === 'award_nomination');

	// Tab handlers
	function switchTab(tabId: string) {
		tabs.switchToTab(tabId);
	}

	async function closeTab(tabId: string) {
		console.log('closeTab', tabId);

		const tab = tabs.getTab(tabId);
		
		// Check if tab has unsaved data
		if (tab && tab.isDataUnsaved()) {
			const confirmed = await dialogs.showConfirmation({
				title: 'Unsaved Changes',
				message: 'You have unsaved changes. Are you sure you want to close this tab?',
				confirmText: 'Close Anyway',
				cancelText: 'Keep Editing',
				confirmButtonClass: 'danger',
				cancelButtonClass: 'primary'
			});

			if (!confirmed) {
				return; // User cancelled, don't close the tab
			}
		}

		tabs.closeTab(tabId);
	}

	function reorderTabs(newOrder: Tab[]) {
		tabs.reorderTabs(newOrder);
	}

	// Warn user before closing browser tab if there are unsaved changes
	$effect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			const hasUnsavedData = allTabs.some((tab) => tab.isDataUnsaved());
			if (hasUnsavedData) {
				// Modern browsers require both preventDefault and returnValue
				e.preventDefault();
				e.returnValue = ''; // Chrome requires returnValue to be set
				return ''; // Some browsers use the return value
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	$effect(() => {
		if (!isJudgingReady) return;

		// Listen to all judge groups if it is a judge advisor or viewing award nomination tab, otherwise listen to the current judge group
		const targetJudgeGroupIds =
			!currentJudgeGroupId || isViewingAwardNominationTab //
				? app.getAllJudgeGroups().map((group) => group.id)
				: [currentJudgeGroupId];

		console.log('Subscribing to award rankings', targetJudgeGroupIds);
		app.wrpcClient.judging.subscribeAwardRankings.mutation({ judgeGroupIds: targetJudgeGroupIds, exclusive: true }).then((data) => {
			subscriptions.allJudgeGroupsAwardRankings = data.reduce(
				(acc, curr) => {
					acc[curr.judgeGroupId] = curr;
					return acc;
				},
				{} as Record<string, AwardRankingsFullUpdate>
			);
		});

		return async () => {
			console.log('Unsubscribing from award rankings', targetJudgeGroupIds);

			await app.wrpcClient.judging.unsubscribeAwardRankings.mutation();
		};
	});

	$effect(() => {
		if (!isJudgingReady) return;

		// Listen to all judge groups if it is a judge advisor, otherwise listen to the current judge group
		const targetJudgeGroupIds = currentJudgeGroupId //
			? [currentJudgeGroupId]
			: app.getAllJudgeGroups().map((group) => group.id);

		console.log('Subscribing to reviewed teams', targetJudgeGroupIds);

		app.wrpcClient.judging.subscribeReviewedTeams.mutation({ judgeGroupIds: targetJudgeGroupIds, exclusive: true }).then((data) => {
			subscriptions.allJudgeGroupsReviewedTeams = data.reduce(
				(acc, curr) => {
					acc[curr.judgeGroupId] = curr.teamIds;
					return acc;
				},
				{} as Record<string, string[]>
			);
		});

		return async () => {
			console.log('Unsubscribing from reviewed teams', targetJudgeGroupIds);

			await app.wrpcClient.judging.unsubscribeReviewedTeams.mutation();
		};
	});

	$effect(() => {
		if (!isJudgingReady) return;

		// Listen to all judge groups if it is a judge advisor, otherwise listen to the current judge group
		const targetJudgeGroupIds = currentJudgeGroupId //
			? [currentJudgeGroupId]
			: app.getAllJudgeGroups().map((group) => group.id);

		console.log('Subscribing to submission caches', targetJudgeGroupIds);

		app.wrpcClient.judging.subscribeSubmissionCaches.mutation({ judgeGroupIds: targetJudgeGroupIds, exclusive: true }).then((data) => {
			subscriptions.allSubmissionCaches = data.reduce(
				(acc, curr) => {
					acc[curr.tiId ?? curr.enrId ?? curr.tnId ?? 'null'] = curr;
					return acc;
				},
				{} as Record<string, SubmissionCache>
			);
		});

		return async () => {
			console.log('Unsubscribing from submission caches', targetJudgeGroupIds);

			await app.wrpcClient.judging.unsubscribeSubmissionCaches.mutation();
		};
	});
</script>

<svelte:head>
	<title>Workspace | Judges' Room</title>
</svelte:head>

<div class="flex h-screen flex-col bg-slate-100">
	<!-- Header -->
	<Header />

	<!-- Tab Bar -->
	<TabBar {allTabs} {activeTabId} onSwitchTab={switchTab} onCloseTab={closeTab} onReorderTabs={reorderTabs} />

	<!-- Main Content -->
	<main class="flex-1 overflow-hidden">
		{#each allTabs as tab (tab.id)}
			<div class="h-full w-full" class:hidden={activeTabId !== tab.id}>
				<tab.component isActive={activeTabId === tab.id} {...(tab as Record<string, any>).props} />
			</div>
		{/each}
	</main>
</div>
