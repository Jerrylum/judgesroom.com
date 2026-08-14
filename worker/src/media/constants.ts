export const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Workers Cache / browser TTL for stable photo URLs (secret is the capability). */
export const PHOTO_CACHE_MAX_AGE_SECONDS = 86400; // 24 hours

/** Disable MIME sniffing so a JPEG-labeled payload is not executed as HTML. */
export const PHOTO_X_CONTENT_TYPE_OPTIONS = 'nosniff';

export function photoContentHeaders(contentType: string, cacheControl: string): Record<string, string> {
	return {
		'Content-Type': contentType,
		'Cache-Control': cacheControl,
		'X-Content-Type-Options': PHOTO_X_CONTENT_TYPE_OPTIONS
	};
}

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
