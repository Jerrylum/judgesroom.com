import crypto from 'crypto';

export function uuidv4() {
	return crypto.randomUUID();
}
