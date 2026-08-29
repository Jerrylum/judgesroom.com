import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dismissJudgeGuideNotice, forgetJudgeGuideNoticeDismissals, wasJudgeGuideNoticeDismissed } from './judge-guide-notice';

const STORAGE_KEY = 'judgeGuideNoticeDismissed';

const memoryStorage = new Map<string, string>();

const localStorageStub = {
	getItem(key: string) {
		return memoryStorage.get(key) ?? null;
	},
	setItem(key: string, value: string) {
		memoryStorage.set(key, value);
	},
	removeItem(key: string) {
		memoryStorage.delete(key);
	}
};

beforeEach(() => {
	Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageStub });
});

afterEach(() => {
	memoryStorage.clear();
});

describe('judge guide notice dismissal', () => {
	it('stores a boolean flag and never writes a room id', () => {
		expect(wasJudgeGuideNoticeDismissed()).toBe(false);
		dismissJudgeGuideNotice();
		expect(wasJudgeGuideNoticeDismissed()).toBe(true);
		expect(memoryStorage.get(STORAGE_KEY)).toBe('1');
		expect([...memoryStorage.values()].some((value) => value.includes('room') || value.includes(':'))).toBe(false);
	});

	it('reads the flag from localStorage after a refresh', () => {
		memoryStorage.set(STORAGE_KEY, '1');
		expect(wasJudgeGuideNoticeDismissed()).toBe(true);
	});

	it('clears the flag when leaving the room', () => {
		dismissJudgeGuideNotice();
		forgetJudgeGuideNoticeDismissals();
		expect(wasJudgeGuideNoticeDismissed()).toBe(false);
		expect(memoryStorage.has(STORAGE_KEY)).toBe(false);
	});
});
