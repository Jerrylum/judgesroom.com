import { describe, expect, it } from 'vitest';
import './index.svelte';
import { AwardNominationTab, AwardRankingTab, TabController } from './tab.svelte';

describe('TabController active tab history', () => {
	it('returns to the previously active tab when the current tab is closed', () => {
		const controller = new TabController();
		const overviewId = controller.activeTab;
		const ranking = new AwardRankingTab();
		const nomination = new AwardNominationTab();

		controller.addTab(ranking);
		controller.addTab(nomination);
		controller.switchToTab(ranking.id);
		controller.closeTab(ranking.id);

		expect(controller.activeTab).toBe(nomination.id);

		controller.closeTab(nomination.id);

		expect(controller.activeTab).toBe(overviewId);
	});

	it('keeps the current tab when a background tab is closed', () => {
		const controller = new TabController();
		const ranking = new AwardRankingTab();
		const nomination = new AwardNominationTab();

		controller.addTab(ranking);
		controller.addTab(nomination);
		controller.closeTab(ranking.id);

		expect(controller.activeTab).toBe(nomination.id);
	});

	it('skips a closed tab and uses the next most recent open tab', () => {
		const controller = new TabController();
		const overviewId = controller.activeTab;
		const ranking = new AwardRankingTab();
		const nomination = new AwardNominationTab();

		controller.addTab(ranking);
		controller.addTab(nomination);
		controller.closeTab(ranking.id);
		controller.closeTab(nomination.id);

		expect(controller.activeTab).toBe(overviewId);
	});

	it('keeps only the most recent 50 active tabs', () => {
		const controller = new TabController();
		const opened: AwardRankingTab[] = [];

		for (let index = 0; index < 51; index++) {
			const tab = new AwardRankingTab();
			opened.push(tab);
			controller.addTab(tab);
		}

		controller.closeTab(opened[50].id);

		expect(controller.activeTab).toBe(opened[49].id);
	});
});
