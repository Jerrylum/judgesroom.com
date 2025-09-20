import { App, AppStorage } from '$lib/app.svelte';
import { DialogController } from './dialog.svelte';
import { TabController } from '$lib/tab.svelte';
import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';

// ============================================================================
// App State
// ============================================================================

export type AppPhase = 'loading' | 'choose_action' | 'event_setup' | 'session_setup' | 'joining_session' | 'role_selection' | 'workspace';

export const AppUI = $state({
	appPhase: 'loading'
});

export const app = new App(new AppStorage(), import.meta.env.DEV);
export const dialogs = new DialogController();
export const tabs = new TabController();

export interface SubscriptionsStorage {
	allJudgeGroupsAwardRankings: Record<string, AwardRankingsFullUpdate>;
	allJudgeGroupsReviewedTeams: Record<string, string[]>;
}

export const subscriptions: SubscriptionsStorage = $state({
	allJudgeGroupsAwardRankings: {},
	allJudgeGroupsReviewedTeams: {}
});
