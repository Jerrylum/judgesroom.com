const STORAGE_KEY = 'judgeGuideNoticeDismissed';

export function wasJudgeGuideNoticeDismissed(): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		return localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

export function dismissJudgeGuideNotice(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, '1');
	} catch {
		// private mode / quota
	}
}

export function forgetJudgeGuideNoticeDismissals(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// private mode / quota
	}
}
