import z from 'zod';

/**
 * Get device name from user agent
 */
export function getDeviceNameFromUserAgent(): string {
	// Try to get device name from various sources
	const userAgent = navigator.userAgent;

	// Check for mobile devices
	if (/iPhone|iPad|iPod/.test(userAgent)) {
		return 'iOS Device';
	}
	if (/Android/.test(userAgent)) {
		return 'Android Device';
	}

	// Check for desktop browsers
	if (/Chrome/.test(userAgent)) {
		return 'Chrome Browser';
	}
	if (/Firefox/.test(userAgent)) {
		return 'Firefox Browser';
	}
	if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
		return 'Safari Browser';
	}
	if (/Edge/.test(userAgent)) {
		return 'Edge Browser';
	}

	// Fallback
	return 'Web Browser';
}

/**
 * Generate a new UUID v4
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: Parameters<T>) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | undefined;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

export function parseSessionUrl(urlOrFragment: string | URL): string | null {
	try {
		let fragment: string;
		if (typeof urlOrFragment === 'string') {
			if (urlOrFragment.startsWith('#')) {
				fragment = urlOrFragment.substring(1);
			} else {
				fragment = urlOrFragment;
			}
		} else {
			fragment = urlOrFragment.hash.substring(1);
		}

		if (!fragment) {
			return null;
		}

		return z.uuidv4().parse(fragment);
	} catch (error) {
		console.error('Failed to parse session URL:', error);
		return null;
	}
}
