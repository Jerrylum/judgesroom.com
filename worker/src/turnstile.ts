export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function hostnameFromHost(host: string): string {
	if (host.startsWith('[')) {
		const end = host.indexOf(']');
		return (end === -1 ? host : host.slice(1, end)).toLowerCase();
	}
	return host.replace(/:\d+$/, '').toLowerCase();
}

export function requestHostname(request: Request): string {
	const host = request.headers.get('Host') ?? new URL(request.url).host;
	return hostnameFromHost(host);
}

export async function verifyTurnstileToken(token: string, turnstileSecretKey: string, request: Request): Promise<boolean> {
	const body = new URLSearchParams({ secret: turnstileSecretKey, response: token });
	const ip = request.headers.get('CF-Connecting-IP');
	if (ip) {
		body.set('remoteip', ip);
	}

	let response: Response;
	try {
		response = await fetch(TURNSTILE_SITEVERIFY_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body
		});
	} catch {
		return false;
	}

	if (!response.ok) {
		return false;
	}

	let result: { success?: boolean; hostname?: string; metadata?: { result_with_testing_key?: boolean } };
	try {
		result = (await response.json()) as { success?: boolean; hostname?: string; metadata?: { result_with_testing_key?: boolean } };
	} catch {
		return false;
	}

	// Cloudflare's always-pass test secret reports hostname "example.com".
	if (result.success === true && result.metadata?.result_with_testing_key === true) {
		return true;
	}

	if (result.success !== true || !result.hostname) {
		return false;
	}

	return result.hostname.toLowerCase() === requestHostname(request);
}
