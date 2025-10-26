export class GoogleAnalytics {
	readonly GTAG = 'G-39NVMKLCK8'; // cspell:disable-line

	private enabled = $state(false);
	private loaded = $state(false);

	private loadGA() {
		if (this.loaded) return;

    this.loaded = true;

		if (window.dataLayer !== undefined) return;
		window.dataLayer = window.dataLayer || [];

		// load GA script
		const script = document.createElement('script');
		script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GTAG}`;
		script.async = true;
		document.body.appendChild(script);

		this.gtag('js', new Date());
		this.gtag('config', this.GTAG);
	}

	public setEnabled(enabled: boolean) {
		if (typeof window === 'undefined') return;

		// @ts-ignore
		window[`ga-disable-${this.GTAG}`] = !enabled;
		this.enabled = enabled;

		if (enabled) {
			this.loadGA();
		}
	}

	public gtag(...args: any[]) {
		if (typeof window === 'undefined') return;
		if (!this.enabled) return;

		window.dataLayer?.push(args);
	}
}

declare global {
	interface Window {
		dataLayer: any[] | undefined;
	}
}
