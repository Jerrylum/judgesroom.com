import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { generateUUID } from './utils.svelte';
import { app } from './app-page.svelte';

// ============================================================================
// Tab System
// ============================================================================

// Base tab interface
interface BaseTab {
	id: string;
	type: string;
	title: string;
	closable: boolean;
}

export class OverviewTab implements BaseTab {
	id: string;
	readonly closable = false;
	readonly type = 'overview';
	readonly title = 'Overview';

	constructor() {
		this.id = generateUUID();
		this.type = 'overview';
	}
}

export class TeamInterviewRubricTab implements BaseTab {
	id: string;
	readonly closable = true;
	readonly type = 'team_interview_rubric';
	teamId: string | null = $state(null);
	rubricId: string | null = $state(null);

	get title() {
		const team = app.getAllTeams().find((team) => team.id === this.teamId);
		return team ? `${team.number} Team Interview` : 'Team Interview';
	}

	constructor(params: { teamId: string | null } | { rubricId: string }) {
		this.id = generateUUID();
		this.type = 'team_interview_rubric';
		
		if ('rubricId' in params) {
			this.rubricId = params.rubricId;
			this.teamId = null; // Will be set when rubric loads
		} else {
			this.teamId = params.teamId;
			this.rubricId = null;
		}
	}
}

export class NotebookRubricTab implements BaseTab {
	id: string;
	readonly closable = true;
	readonly type = 'notebook_rubric';
	teamId: string | null = $state(null);
	rubricId: string | null = $state(null);

	get title() {
		const team = app.getAllTeams().find((team) => team.id === this.teamId);
		return team ? `${team.number} Notebook Review` : 'Notebook Review';
	}

	constructor(params: { teamId: string | null } | { rubricId: string }) {
		this.id = generateUUID();

		if ('rubricId' in params) {
			this.rubricId = params.rubricId;
			this.teamId = null; // Will be set when rubric loads
		} else {
			this.teamId = params.teamId;
			this.rubricId = null;
		}
	}
}

export class NotebookSortingTab implements BaseTab {
	id: string;
	readonly closable = true;
	readonly type = 'notebook_sorting';
	readonly title = 'Notebook Sorting';

	constructor() {
		this.id = generateUUID();
	}
}

export class AwardRankingsTab implements BaseTab {
	id: string;
	readonly closable = true;
	readonly type = 'award_rankings';
	readonly title = 'Award Rankings';

	constructor() {
		this.id = generateUUID();
	}
}

// Custom tab for extensibility
export interface CustomTab extends BaseTab {
	type: 'custom';
	component: Component;
	props: Record<string, unknown>;
}

export type Tab = OverviewTab | TeamInterviewRubricTab | NotebookRubricTab | NotebookSortingTab | AwardRankingsTab | CustomTab;

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

	private generateId(): string {
		return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Add a tab
	 */
	addTab(tab: Tab): string {
		this.tabs.push(tab);
		this.switchToTab(tab.id);
		return tab.id;
	}

	/**
	 * Add a custom tab
	 */
	addCustomTab(
		component: Component,
		options: {
			title: string;
			props?: Record<string, unknown>;
		}
	): string {
		const id = this.generateId();
		const tab: CustomTab = {
			id,
			type: 'custom',
			title: options.title,
			closable: true,
			component,
			props: options.props || {}
		};

		this.tabs.push(tab);
		this.switchToTab(id);
		return id;
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

		const tab = this.tabs[tabIndex];
		if (!tab.closable) return;

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
		const closableTabs = this.tabs.filter((tab) => tab.closable);
		closableTabs.forEach((tab) => this.closeTab(tab.id));
	}

	/**
	 * Find tab by type and optional properties
	 */
	findTab(type: string, props?: Record<string, unknown>): Tab | null {
		return (
			this.tabs.find((tab) => {
				if (tab.type !== type) return false;
				if (!props) return true;

				// Check if all provided props match
				return Object.entries(props).every(([key, value]) => (tab as unknown as Record<string, unknown>)[key] === value);
			}) || null
		);
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
	 * Register for tab change notifications
	 */
	onTabChange(handler: (tabId: string | null) => void): () => void {
		const id = this.generateId();
		this.tabChangeHandlers.set(id, handler);

		// Return unsubscribe function
		return () => {
			this.tabChangeHandlers.delete(id);
		};
	}

	private notifyTabChange(tabId: string | null): void {
		this.tabChangeHandlers.forEach((handler) => handler(tabId));
	}
}
