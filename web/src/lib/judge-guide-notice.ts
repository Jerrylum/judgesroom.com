const STORAGE_KEY = 'judgeGuideVersionNoticeDismissed';

function permitKey(roomId: string, deviceId: string): string {
	return `${roomId}:${deviceId}`;
}

function readDismissed(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
	} catch {
		return [];
	}
}

export function wasJudgeGuideNoticeDismissed(roomId: string, deviceId: string): boolean {
	return readDismissed().includes(permitKey(roomId, deviceId));
}

export function dismissJudgeGuideNotice(roomId: string, deviceId: string): void {
	const key = permitKey(roomId, deviceId);
	const dismissed = readDismissed();
	if (dismissed.includes(key)) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, key]));
	} catch (error) {
		console.error('Failed to save judge guide notice dismissal:', error);
	}
}
