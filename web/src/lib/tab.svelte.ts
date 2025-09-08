import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

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

// Overview tab (non-closable home tab)
export interface OverviewTab extends BaseTab {
	type: 'overview';
}

// Team Interview Rubric tab
export interface TeamInterviewRubricTab extends BaseTab {
	type: 'team_interview_rubric';
	teamId?: string;
	judgeGroupId?: string;
}

// Notebook Rubric tab
export interface NotebookRubricTab extends BaseTab {
	type: 'notebook_rubric';
	teamId?: string;
	judgeGroupId?: string;
}

// Award Rankings tab
export interface AwardRankingsTab extends BaseTab {
	type: 'award_rankings';
	awardId?: string;
}

// Custom tab for extensibility
export interface CustomTab extends BaseTab {
	type: 'custom';
	component: Component;
	props: Record<string, unknown>;
}

export type Tab = OverviewTab | TeamInterviewRubricTab | NotebookRubricTab | AwardRankingsTab | CustomTab;

export class TabController {
	private tabs: Tab[] = $state([]);
	private activeTabId: string | null = $state(null);
	private tabChangeHandlers = new SvelteMap<string, (tabId: string | null) => void>();

	constructor() {
		// Initialize with overview tab
		this.addOverviewTab();
	}

	get allTabs() {
		return this.tabs;
	}

	get currentTab() {
		return this.tabs.find(tab => tab.id === this.activeTabId) || null;
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
	 * Add the default overview tab
	 */
	private addOverviewTab(): void {
		const overviewTab: OverviewTab = {
			id: 'overview',
			type: 'overview',
			title: 'Overview',
			closable: false
		};
		this.tabs.push(overviewTab);
		this.activeTabId = 'overview';
	}

	/**
	 * Add a team interview rubric tab
	 */
	addTeamInterviewRubricTab(options: {
		title?: string;
		teamId?: string;
		judgeGroupId?: string;
	} = {}): string {
		const id = this.generateId();
		const tab: TeamInterviewRubricTab = {
			id,
			type: 'team_interview_rubric',
			title: options.title || 'Team Interview',
			closable: true,
			teamId: options.teamId,
			judgeGroupId: options.judgeGroupId
		};

		this.tabs.push(tab);
		this.switchToTab(id);
		return id;
	}

	/**
	 * Add a notebook rubric tab
	 */
	addNotebookRubricTab(options: {
		title?: string;
		teamId?: string;
		judgeGroupId?: string;
	} = {}): string {
		const id = this.generateId();
		const tab: NotebookRubricTab = {
			id,
			type: 'notebook_rubric',
			title: options.title || 'Notebook Review',
			closable: true,
			teamId: options.teamId,
			judgeGroupId: options.judgeGroupId
		};

		this.tabs.push(tab);
		this.switchToTab(id);
		return id;
	}

	/**
	 * Add an award rankings tab
	 */
	addAwardRankingsTab(options: {
		title?: string;
		awardId?: string;
	} = {}): string {
		const id = this.generateId();
		const tab: AwardRankingsTab = {
			id,
			type: 'award_rankings',
			title: options.title || 'Award Rankings',
			closable: true,
			awardId: options.awardId
		};

		this.tabs.push(tab);
		this.switchToTab(id);
		return id;
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
		const tab = this.tabs.find(t => t.id === tabId);
		if (tab) {
			this.activeTabId = tabId;
			this.notifyTabChange(tabId);
		}
	}

	/**
	 * Close a tab
	 */
	closeTab(tabId: string): void {
		const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
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
		const closableTabs = this.tabs.filter(tab => tab.closable);
		closableTabs.forEach(tab => this.closeTab(tab.id));
	}

	/**
	 * Find tab by type and optional properties
	 */
	findTab(type: string, props?: Record<string, unknown>): Tab | null {
		return this.tabs.find(tab => {
			if (tab.type !== type) return false;
			if (!props) return true;
			
			// Check if all provided props match
			return Object.entries(props).every(([key, value]) => 
				(tab as unknown as Record<string, unknown>)[key] === value
			);
		}) || null;
	}

	/**
	 * Check if a tab exists
	 */
	hasTab(tabId: string): boolean {
		return this.tabs.some(tab => tab.id === tabId);
	}

	/**
	 * Get tab by ID
	 */
	getTab(tabId: string): Tab | null {
		return this.tabs.find(tab => tab.id === tabId) || null;
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
		this.tabChangeHandlers.forEach(handler => handler(tabId));
	}
}
