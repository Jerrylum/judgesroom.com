import { App, AppStorage } from '$lib/app.svelte';
import { DialogController } from './dialog.svelte';
import { TabController } from '$lib/tab.svelte';
import type { SubscriptionsStorage } from './subscriptions.svelte';

// ============================================================================
// App State
// ============================================================================

export type AppPhase = 'loading' | 'begin' | 'event_setup' | 'judges_room_setup' | 'joining_judges_room' | 'role_selection' | 'workspace';
export interface AppUIState {
	appPhase: AppPhase;
}

export const AppUI: AppUIState = $state({
	appPhase: 'loading'
});

export const app = new App(new AppStorage(), import.meta.env.DEV);
export const dialogs = new DialogController();
export const tabs = new TabController();
export const subscriptions: SubscriptionsStorage = $state({
	allJudgeGroupsAwardRankings: {},
	allJudgeGroupsReviewedTeams: {},
	allSubmissionCaches: {}
});
