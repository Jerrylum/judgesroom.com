import { sanitizeAnalyticsUrl } from './analytics-url';

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
		const config: { page_location: string; page_referrer?: string } = {
			page_location: sanitizeAnalyticsUrl(window.location.href)
		};
		if (document.referrer) {
			config.page_referrer = sanitizeAnalyticsUrl(document.referrer);
		}
		this.gtag('config', this.GTAG, config);
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

		window.dataLayer?.push(arguments);
	}
}

declare global {
	interface Window {
		dataLayer: any[] | undefined;
	}
}
