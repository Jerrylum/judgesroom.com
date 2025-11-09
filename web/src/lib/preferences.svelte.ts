import type { AppStorage } from './app.svelte';

export interface PreferencesData {
	isGoogleAnalyticsEnabled: boolean;
	notebookSortingTabViewMode: 'grid' | 'column';
}

export class Preferences {
	private storageKey = 'preferences';
	private storage: AppStorage;
	private data: PreferencesData = $state({
		isGoogleAnalyticsEnabled: true,
		notebookSortingTabViewMode: 'grid'
	});

	constructor(storage: AppStorage) {
		this.storage = storage;
		this.linkLocalStorage();

		if (typeof window !== 'undefined') {
			window.addEventListener('storage', (evt) => {
				if (evt.key !== this.storageKey) return;
				this.linkLocalStorage();
			});
		}
	}

	public get<K extends keyof PreferencesData>(key: K): PreferencesData[K] {
		return this.data[key];
	}

	public set<K extends keyof PreferencesData>(key: K, value: PreferencesData[K]): void {
		this.data[key] = value;
		this.storage.save(this.storageKey, $state.snapshot(this.data));
	}

	private linkLocalStorage() {
    if (typeof window === 'undefined') return;
		const data = this.storage.load<Partial<PreferencesData>>(this.storageKey);
		if (data) {
			this.data.isGoogleAnalyticsEnabled = data.isGoogleAnalyticsEnabled ?? true;
			this.data.notebookSortingTabViewMode = data.notebookSortingTabViewMode ?? 'grid';
		}
	}
}
