/**
 * Drop search and hash so join capability (roomId / auth) never goes to analytics.
 */
export function sanitizeAnalyticsUrl(url: string): string {
	try {
		const parsed = new URL(url);
		parsed.search = '';
		parsed.hash = '';
		return parsed.toString();
	} catch {
		return url;
	}
}
