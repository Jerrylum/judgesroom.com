import { v4 } from 'uuid';

export function uuidv4() {
	return v4();
}

/** Constant-time equality for equal-length secrets. Length mismatch returns false immediately. */
export function timingSafeEqualString(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}
