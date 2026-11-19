interface TurnstileRenderOptions {
	sitekey: string;
	theme?: 'light' | 'dark' | 'auto';
	callback: (token: string) => void;
	'expired-callback': () => void;
	'error-callback': () => void;
}

interface TurnstileApi {
	render: (element: HTMLElement, options: TurnstileRenderOptions) => string;
	remove: (widgetId: string) => void;
}

interface Window {
	turnstile?: TurnstileApi;
}
