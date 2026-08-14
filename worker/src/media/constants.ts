export const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Workers Cache / browser TTL for stable photo URLs (secret is the capability). */
export const PHOTO_CACHE_MAX_AGE_SECONDS = 86400; // 24 hours

/** Cache-Tag values (printable ASCII, no spaces). */
export function photoCacheTags(roomId: string, photoId: string): string[] {
	return [`room-${roomId}`, `photo-${photoId}`];
}

export function roomPhotoCacheTag(roomId: string): string {
	return `room-${roomId}`;
}

export function photoCacheTag(photoId: string): string {
	return `photo-${photoId}`;
}

export { timingSafeEqualString } from '@judgesroom.com/protocol/src/utils';
