import type { Component, ComponentProps } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { generateUUID } from './utils.svelte';
import { app } from './index.svelte';
import OverviewTabComponent from './components/workspace/tabs/OverviewTab.svelte';
import TeamInterviewRubricTabComponent from './components/workspace/tabs/TeamInterviewRubricTab.svelte';
import NotebookRubricTabComponent from './components/workspace/tabs/NotebookRubricTab.svelte';
import NotebookSortingTabComponent from './components/workspace/tabs/NotebookSortingTab.svelte';
import AwardRankingTabComponent from './components/workspace/tabs/AwardRankingTab.svelte';
import AwardNominationTabComponent from './components/workspace/tabs/AwardNominationTab.svelte';
import FinalRankingTabComponent from './components/workspace/tabs/FinalRankingTab.svelte';
import AwardWinnerTabComponent from './components/workspace/tabs/AwardWinnerTab.svelte';
import TeamAttendanceTabComponent from './components/workspace/tabs/TeamAttendanceTab.svelte';
import ExcellenceAwardEligibilityTabComponent from './components/workspace/tabs/ExcellenceAwardCandidatesTab.svelte';

// ============================================================================
// Tab System
// ============================================================================

// Base tab interface
interface BaseTab<C extends Component<ComponentProps<C>>> {
	readonly id: string;
	isPinned: boolean;
	component: C;
	props: Omit<ComponentProps<C>, 'isActive'>;
	get title(): string;
	get hash(): string;
	isEqual(other: BaseTab<C>): boolean;
	isDataUnsaved(): boolean;
}

export class OverviewTab implements BaseTab<typeof OverviewTabComponent> {
	readonly id: string;
	readonly isPinned = true;
	readonly type = 'overview';
	readonly component = OverviewTabComponent;
	readonly props = {};

	get title() {
		return 'Overview';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class TeamAttendanceTab implements BaseTab<typeof TeamAttendanceTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'team_attendance';
	readonly component = TeamAttendanceTabComponent;
	readonly props = {};

	get title() {
		return 'Team Attendance';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class NotebookSortingTab implements BaseTab<typeof NotebookSortingTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'notebook_sorting';
	readonly component = NotebookSortingTabComponent;
	readonly props = { tab: this };

	get title() {
		return 'Notebook Sorting';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class NotebookRubricTab implements BaseTab<typeof NotebookRubricTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'notebook_rubric';
	readonly component = NotebookRubricTabComponent;
	readonly props = { tab: this };
	teamId: string = $state('');
	rubricId: string | null = $state(null);
	_isDataUnsaved: boolean = $state(false);

	get title() {
		const team = app.findTeamById(this.teamId);
		return team ? `${team.number} Notebook Review` : 'Notebook Review';
	}

	get hash() {
		return JSON.stringify({ type: this.type, rubricId: this.rubricId });
	}

	isEqual(other: BaseTab<any>): boolean {
		if (other.component === this.component) {
			const otherRubricId = (other as NotebookRubricTab).rubricId;
			const thisRubricId = this.rubricId;
			if (otherRubricId !== null || thisRubricId !== null) {
				return otherRubricId === thisRubricId;
			} else {
				return (other as NotebookRubricTab).teamId === this.teamId;
			}
		}
		return false;
	}

	isDataUnsaved(): boolean {
		return this._isDataUnsaved;
	}

	constructor(params: { teamId: string } | { rubricId: string }) {
		this.id = generateUUID();

		if ('rubricId' in params) {
			this.rubricId = params.rubricId;
			this.teamId = ''; // Will be set when rubric loads
		} else {
			this.teamId = params.teamId;
			this.rubricId = null; // Will be set after the rubric is saved
		}
	}
}

export class TeamInterviewRubricTab implements BaseTab<typeof TeamInterviewRubricTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'team_interview_rubric';
	readonly component = TeamInterviewRubricTabComponent;
	readonly props = { tab: this };
	teamId: string = $state('');
	rubricId: string | null = $state(null);
	_isDataUnsaved: boolean = $state(false);

	get title() {
		const team = app.findTeamById(this.teamId);
		return team ? `${team.number} Team Interview` : 'Team Interview';
	}

	get hash() {
		return JSON.stringify({ type: this.type, rubricId: this.rubricId });
	}

	isEqual(other: BaseTab<any>): boolean {
		if (other.component === this.component) {
			const otherRubricId = (other as NotebookRubricTab).rubricId;
			const thisRubricId = this.rubricId;
			if (otherRubricId !== null || thisRubricId !== null) {
				return otherRubricId === thisRubricId;
			} else {
				return (other as NotebookRubricTab).teamId === this.teamId;
			}
		}
		return false;
	}

	isDataUnsaved(): boolean {
		return this._isDataUnsaved;
	}

	constructor(params: { teamId: string } | { rubricId: string }) {
		this.id = generateUUID();

		if ('rubricId' in params) {
			this.rubricId = params.rubricId;
			this.teamId = ''; // Will be set when rubric loads
		} else {
			this.teamId = params.teamId;
			this.rubricId = null; // Will be set after the rubric is saved
		}
	}
}

export class AwardRankingTab implements BaseTab<typeof AwardRankingTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'award_ranking';
	readonly component = AwardRankingTabComponent;
	readonly props = { tab: this };

	get title() {
		return 'Award Ranking';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class AwardNominationTab implements BaseTab<typeof AwardNominationTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'award_nomination';
	readonly component = AwardNominationTabComponent;
	readonly props = { tab: this };

	get title() {
		return 'Award Nomination';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class ExcellenceAwardCandidatesTab implements BaseTab<typeof ExcellenceAwardEligibilityTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'excellence_award_candidates';
	readonly component = ExcellenceAwardEligibilityTabComponent;
	readonly props = { tab: this };

	get title() {
		return 'Excellence Award Candidates';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class FinalAwardRankingTab implements BaseTab<typeof FinalRankingTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'final_award_ranking';
	readonly component = FinalRankingTabComponent;
	readonly props = { tab: this };

	get title() {
		return 'Final Ranking';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export class AwardWinnerTab implements BaseTab<typeof AwardWinnerTabComponent> {
	readonly id: string;
	readonly isPinned = false;
	readonly type = 'award_winner';
	readonly component = AwardWinnerTabComponent;
	readonly props = { tab: this };

	get title() {
		return 'Award Winner';
	}

	get hash() {
		return JSON.stringify({ type: this.type });
	}

	isEqual(other: BaseTab<any>): boolean {
		return this.hash === other.hash;
	}

	isDataUnsaved(): boolean {
		return false;
	}

	constructor() {
		this.id = generateUUID();
	}
}

export type Tab =
	| OverviewTab
	| TeamAttendanceTab
	| NotebookSortingTab
	| NotebookRubricTab
	| TeamInterviewRubricTab
	| AwardRankingTab
	| AwardNominationTab
	| ExcellenceAwardCandidatesTab
	| FinalAwardRankingTab
	| AwardWinnerTab;

export class TabController {
	private tabs: Tab[] = $state([]);
	private activeTabId: string | null = $state(null);
	private tabChangeHandlers = new SvelteMap<string, (tabId: string | null) => void>();

	constructor() {
		// Initialize with overview tab
		this.addTab(new OverviewTab());
	}

	get allTabs() {
		return this.tabs;
	}

	get currentTab() {
		return this.tabs.find((tab) => tab.id === this.activeTabId) || null;
	}

	get activeTab() {
		return this.activeTabId;
	}

	get hasMultipleTabs() {
		return this.tabs.length > 1;
	}

	/**
	 * Add a tab
	 */
	addTab(tab: Tab): string {
		this.tabs.push(tab);
		this.switchToTab(tab.id);
		return tab.id;
	}

	addOrReuseTab(tab: Tab): void {
		const existingTab = this.findTab(tab);
		if (existingTab) {
			this.switchToTab(existingTab.id);
		} else {
			this.addTab(tab);
		}
	}

	/**
	 * Switch to a specific tab
	 */
	switchToTab(tabId: string): void {
		const tab = this.tabs.find((t) => t.id === tabId);
		if (tab) {
			this.activeTabId = tabId;
			this.notifyTabChange(tabId);
		}
	}
	/**
	 * Close a tab
	 */
	closeTab(tabId: string): void {
		const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
		if (tabIndex === -1) return;

		// Remove the tab
		this.tabs.splice(tabIndex, 1);

		// If we're closing the active tab, switch to another tab
		if (this.activeTabId === tabId) {
			if (this.tabs.length > 0) {
				// Switch to the previous tab, or the first tab if we were at the beginning
				const newIndex = Math.max(0, tabIndex - 1);
				this.activeTabId = this.tabs[newIndex].id;
				this.notifyTabChange(this.activeTabId);
			} else {
				this.activeTabId = null;
				this.notifyTabChange(null);
			}
		}
	}

	/**
	 * Close all closable tabs
	 */
	closeAllTabs(): void {
		const closableTabs = this.tabs.filter((tab) => tab.isPinned);
		closableTabs.forEach((tab) => this.closeTab(tab.id));
	}

	/**
	 * Find tab by component and optional properties
	 */
	findTab(targetTab: Tab): Tab | null {
		return this.tabs.find((tab) => tab.isEqual(targetTab)) || null;
	}

	/**
	 * Check if a tab exists
	 */
	hasTab(tabId: string): boolean {
		return this.tabs.some((tab) => tab.id === tabId);
	}

	/**
	 * Get tab by ID
	 */
	getTab(tabId: string): Tab | null {
		return this.tabs.find((tab) => tab.id === tabId) || null;
	}

	/**
	 * Reorder tabs (for drag and drop functionality)
	 */
	reorderTabs(newOrder: Tab[]): void {
		this.tabs = newOrder;
	}

	private notifyTabChange(tabId: string | null): void {
		this.tabChangeHandlers.forEach((handler) => handler(tabId));
	}
}
