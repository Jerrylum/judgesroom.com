<script lang="ts">
	const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

	let { siteKey, token = $bindable<string | null>(null) }: { siteKey: string; token?: string | null } = $props();

	function loadScript(): Promise<void> {
		if (window.turnstile) {
			return Promise.resolve();
		}

		const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
		if (existing) {
			return new Promise((resolve, reject) => {
				if (window.turnstile) {
					resolve();
					return;
				}
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')), { once: true });
			});
		}

		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = SCRIPT_SRC;
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Turnstile failed to load'));
			document.head.appendChild(script);
		});
	}

	function mountTurnstile(element: HTMLDivElement) {
		let widgetId: string | undefined;
		let removed = false;

		loadScript()
			.then(() => {
				if (removed || !window.turnstile) {
					return;
				}
				widgetId = window.turnstile.render(element, {
					sitekey: siteKey,
					theme: 'light',
					callback: (next) => {
						token = next;
					},
					'expired-callback': () => {
						token = null;
					},
					'error-callback': () => {
						token = null;
					}
				});
			})
			.catch(() => {
				token = null;
			});

		return () => {
			removed = true;
			if (widgetId && window.turnstile) {
				window.turnstile.remove(widgetId);
			}
		};
	}
</script>

<div {@attach mountTurnstile}></div>
