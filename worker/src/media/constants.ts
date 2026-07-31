export const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Workers Cache / browser TTL for stable photo URLs (secret is the capability). */
export const PHOTO_CACHE_MAX_AGE_SECONDS = 86400; // 24 hours

export function photoObjectKey(roomId: string, teamId: string, photoId: string, contentType: string): string {
	const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
	return `rooms/${roomId}/teams/${teamId}/${photoId}.${ext}`;
}

export function roomPhotosPrefix(roomId: string): string {
	return `rooms/${roomId}/`;
}

/** Cache-Tag values (printable ASCII, no spaces). */
export function photoCacheTags(roomId: string, photoId: string): string[] {
	return [`room-${roomId}`, `photo-${photoId}`];
}

export function roomPhotoCacheTag(roomId: string): string {
	return `room-${roomId}`;
}

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
