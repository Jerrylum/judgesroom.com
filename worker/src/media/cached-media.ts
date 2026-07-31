import { WorkerEntrypoint } from 'cloudflare:workers';
import { PHOTO_CACHE_MAX_AGE_SECONDS, photoCacheTags } from './constants';

/**
 * Cached entrypoint for team interview photo GETs.
 * Workers Cache sits in front of this class — on a HIT, fetch() never runs.
 * Purges must run here (purge is scoped per entrypoint).
 */
export class CachedMedia extends WorkerEntrypoint<Env> {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method !== 'GET' || url.pathname !== '/media/photo') {
			return new Response('Not found', { status: 404 });
		}

		const roomId = url.searchParams.get('roomId');
		const photoId = url.searchParams.get('photoId');
		const secret = url.searchParams.get('secret');
		if (!roomId || !photoId || !secret) {
			return new Response('Missing roomId, photoId, or secret', { status: 400 });
		}

		const id = this.env.WEBSOCKET_HIBERNATION_SERVER.idFromName(roomId);
		const stub = this.env.WEBSOCKET_HIBERNATION_SERVER.get(id);
		const response = await stub.handleMediaRequest(request);

		if (!response.ok) {
			return response;
		}

		const headers = new Headers(response.headers);
		headers.set('Cache-Control', `public, max-age=${PHOTO_CACHE_MAX_AGE_SECONDS}`);
		headers.set('Cache-Tag', photoCacheTags(roomId, photoId).join(','));

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	}

	/** Invalidate cached photo responses. Scoped to this entrypoint's cache. */
	async purgeTags(tags: string[]): Promise<void> {
		if (tags.length === 0) {
			return;
		}
		const workerCache = this.ctx.cache;
		if (!workerCache) {
			return;
		}
		const result = await workerCache.purge({ tags });
		if (!result.success) {
			console.error('Workers Cache purge failed', result.errors);
		}
	}
}
