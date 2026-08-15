import type { TeamData } from '@judgesroom.com/protocol/src/team';
import { AuthTokenSchema } from '@judgesroom.com/protocol/src/access';
import { RoomIdSchema } from '@judgesroom.com/protocol/src/room-id';
import { SvelteSet, SvelteURL } from 'svelte/reactivity';
import { v4 } from 'uuid';

/**
 * Clipboard write (navigator.clipboard) requires a secure context.
 * False on plain HTTP LAN hosts (e.g. http://192.168.x.x); true on https and localhost.
 */
export function canUseClipboard(): boolean {
	return typeof window !== 'undefined' && window.isSecureContext && typeof navigator.clipboard?.writeText === 'function';
}

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
	// return crypto.randomUUID();
	return v4();
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

export function parseJudgesRoomUrl(url: string): string | null {
	try {
		const roomId = new SvelteURL(url).searchParams.get('roomId');
		if (!roomId) return null;
		return RoomIdSchema.parse(roomId);
	} catch (error) {
		console.error("Failed to parse Judges' Room URL:", error);
		return null;
	}
}

export function parseAuthTokenFromUrl(url: string): string | null {
	try {
		const auth = new SvelteURL(url).searchParams.get('auth');
		if (!auth) return null;
		const parsed = AuthTokenSchema.safeParse(auth);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function buildJudgesRoomJoinUrl(origin: string, roomId: string, authToken?: string | null): string {
	const url = new URL('/join', origin);
	url.searchParams.set('roomId', roomId);
	if (authToken) {
		url.searchParams.set('auth', authToken);
	}
	return url.toString();
}

export function errorToString(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

export function processTeamDataArray(input: Readonly<Readonly<TeamData>[]>): Record<string, TeamData> {
	return input.reduce(
		(acc: Record<string, TeamData>, team) => {
			acc[team.id] = team;
			return acc;
		},
		{} as Record<string, TeamData>
	);
}

/**
 * Merge two arrays, keeping the order of the first array and adding the items of the second array that are not in the first array
 * @param inOrder - The array to merge into
 * @param superSet - The array to merge from
 * @returns The merged array
 */
export function mergeArrays(inOrder: string[], superSet: string[]): string[] {
	const set = new SvelteSet(inOrder);
	const rtn = [...inOrder];
	for (const item of superSet) {
		if (!set.has(item)) {
			rtn.push(item);
		}
	}
	return rtn;
}
