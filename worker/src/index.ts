import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { createWebSocketHandler } from '@judgesroom.com/wrpc/server';
import { ServerRouter, serverRouter, type ServerContext } from './server-router';
import { drizzle, DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import migrations from '../drizzle/migrations';
import { broadcastDeviceListUpdate } from './routes/device';
import { unsubscribeTopics } from './routes/subscriptions';
import { metadata } from './db/schema';
import { completePhotoUpload, getPhotoObject, listUploads } from './routes/media';
import { createPhotosBucket } from './media/r2';
import type { PhotosBucket } from './media/types';
import { photoCacheTag, roomPhotoCacheTag } from './media/constants';
import type { ClientRouter } from './client-router';
import { MAX_PHOTO_BYTES } from '@judgesroom.com/protocol/src/media';
import { AuthTokenSchema } from '@judgesroom.com/protocol/src/access';
import { Authentication } from './access/authentication';
import { JudgesRoomNetwork, type WsAttachment } from './network/judges-room-network';

export { CachedMedia } from './media/cached-media';

const IntentionSchema = z.object({
	roomId: z.uuidv4(),
	clientId: z.uuidv4(),
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(20),
	action: z.enum(['create', 'join', 'rejoin']),
	auth: AuthTokenSchema.nullable()
});

type Intention = z.infer<typeof IntentionSchema>;

function parseIntention(request: Request): Intention | null {
	const url = new URL(request.url);
	const result = IntentionSchema.safeParse({
		roomId: url.searchParams.get('roomId'),
		clientId: url.searchParams.get('clientId'),
		deviceId: url.searchParams.get('deviceId'),
		deviceName: url.searchParams.get('deviceName'),
		action: url.searchParams.get('action'),
		auth: url.searchParams.get('auth') // null when absent; invalid token still fails schema
	});

	if (!result.success) {
		return null;
	}

	return result.data;
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class WebSocketHibernationServer extends DurableObject<Env> {
	private wsHandler = createWebSocketHandler<ServerRouter>({
		router: serverRouter,
		loadData: () => this.ctx.storage.get('wrpc-data'),
		saveData: (data) => this.ctx.storage.put('wrpc-data', data),
		destroy: async () => {
			const data = (await this.ctx.storage.get('wrpc-data')) as { roomId: string | null } | undefined;
			const roomId = data?.roomId ?? null;
			if (roomId) {
				const photoIds = Array.from(await listUploads(this.db));
				if (photoIds.length > 0) {
					await this.env.TEAM_PHOTOS.delete(photoIds);
				}
				await this.env.CACHED_MEDIA.purgeTags([roomPhotoCacheTag(roomId)]);
			}
			await this.ctx.storage.deleteAll();
		},
		getWebSocket: (clientId) => this.ctx.getWebSockets(clientId)[0] || null,
		getClientIdByWebSocket: (ws) => this.ctx.getTags(ws)[0] || null,
		onError: (opts) => {
			console.error('WRPC Error:', opts.error.message, opts.error);
		}
	});
	private db: DrizzleSqliteDODatabase;
	private photos: PhotosBucket;
	private network: JudgesRoomNetwork;

	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// Initialize the WebSocket handler with hibernation support
		this.wsHandler.initialize().catch(console.error);
		this.db = drizzle(this.ctx.storage);
		this.photos = createPhotosBucket(this.env.TEAM_PHOTOS, (photoIds) => this.env.CACHED_MEDIA.purgeTags(photoIds.map(photoCacheTag)));
		this.network = new JudgesRoomNetwork({
			inner: this.wsHandler.connectionManager,
			db: this.db,
			getWebSockets: () => this.ctx.getWebSockets()
		});

		// Make sure all migrations complete before accepting queries.
		// Otherwise you will need to run `this.migrate()` in any function
		// that accesses the Drizzle database `this.db`.
		ctx.blockConcurrencyWhile(async () => {
			await migrate(this.db, migrations);
		});
	}

	private httpServerContext(): ServerContext {
		return {
			db: this.db,
			network: this.network,
			photos: this.photos,
			auth: Authentication.unauthenticated()
		};
	}

	private async serverContextForWebSocket(ws: WebSocket): Promise<ServerContext> {
		const attachment = ws.deserializeAttachment() as WsAttachment | null;
		if (!attachment) {
			throw new Error('CRITICAL: Missing WebSocket attachment');
		}

		return {
			db: this.db,
			network: this.network,
			photos: this.photos,
			auth: new Authentication({
				authentication: attachment.authentication,
				persist: (nextAuthentication) => {
					const current = ws.deserializeAttachment() as WsAttachment | null;
					if (!current) {
						throw new Error('CRITICAL: Missing WebSocket attachment');
					}
					ws.serializeAttachment({ ...current, authentication: nextAuthentication } satisfies WsAttachment);
				}
			})
		};
	}

	async getMetadata() {
		const metadataRows = await this.db.select().from(metadata).limit(1);
		if (metadataRows.length === 0) {
			return null;
		}

		return metadataRows[0];
	}

	async handleMediaRequest(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const ctx = this.httpServerContext();

		try {
			if (url.pathname === '/media/upload' && request.method === 'PUT') {
				const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('token');
				if (!token) {
					return new Response('Missing upload token', { status: 401 });
				}

				const contentLengthHeader = request.headers.get('Content-Length');
				if (contentLengthHeader === null) {
					return new Response('Content-Length required', { status: 411 });
				}
				const contentLength = Number(contentLengthHeader);
				if (!Number.isFinite(contentLength) || contentLength < 0) {
					return new Response('Invalid Content-Length', { status: 400 });
				}
				if (contentLength > MAX_PHOTO_BYTES) {
					return new Response('Photo too large', { status: 413 });
				}

				const body = await request.arrayBuffer();
				if (body.byteLength !== contentLength) {
					return new Response('Content-Length does not match body size', { status: 400 });
				}
				const photo = await completePhotoUpload(ctx, token, body, request.headers.get('Content-Type'));

				void this.wsHandler.broadcast<ClientRouter>().onTeamPhotoUpdate.mutation({
					action: 'added',
					photo
				});

				return Response.json(photo, { status: 201 });
			}

			if (url.pathname === '/media/photo' && request.method === 'GET') {
				const photoId = url.searchParams.get('photoId');
				const secret = url.searchParams.get('secret');
				if (!photoId || !secret) {
					return new Response('Missing photoId or secret', { status: 400 });
				}

				const { body, contentType, cacheControl } = await getPhotoObject(ctx, photoId, secret);
				return new Response(body.body, {
					headers: {
						'Content-Type': contentType,
						'Cache-Control': cacheControl
					}
				});
			}

			return new Response('Not found', { status: 404 });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Media request failed';
			const status =
				message.includes('Invalid') || message.includes('expired') || message.includes('Unauthorized')
					? 401
					: message.includes('not found') || message.includes('missing')
						? 404
						: message.includes('size') || message.includes('Content-Type') || message.includes('Maximum')
							? 400
							: 500;
			return new Response(message, { status });
		}
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/media/')) {
			return this.handleMediaRequest(request);
		}

		const intention = parseIntention(request);
		if (!intention) {
			return new Response('Invalid request', { status: 400 });
		}

		const { roomId, clientId, deviceId, deviceName, auth } = intention;

		const connectAuth = await this.network.authorizeConnect(auth);
		if (!connectAuth.allowed) {
			return connectAuth.response;
		}

		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		if (!client || !server) {
			return new Response('Failed to create WebSocket pair', { status: 500 });
		}

		// Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		// Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
		// is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
		// the connection is open. During periods of inactivity, the Durable Object can be evicted
		// from memory, but the WebSocket connection will remain open. If at some later point the
		// WebSocket receives a message, the runtime will recreate the Durable Object
		// (run the `constructor`) and deliver the message to the appropriate handler.
		this.ctx.acceptWebSocket(server, [clientId]);
		server.serializeAttachment({
			roomId,
			clientId,
			deviceId,
			deviceName,
			authentication: connectAuth.authentication
		} satisfies WsAttachment);

		// Set up connection with the WebSocket handler (now async for storage)
		await this.wsHandler.handleConnection(server, { roomId, clientId, deviceId, deviceName });

		// We do not broadcast device list update here, it will be done when the device sends a join request

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
		// Convert ArrayBuffer to string if necessary
		const messageStr = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage);

		// The connection manager will handle finding the right client based on the WebSocket
		const messageCtx = await this.serverContextForWebSocket(ws);
		await this.wsHandler.handleMessage(ws, messageStr, messageCtx);
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
		// Delegate to the WebSocket handler
		const clientId = await this.wsHandler.handleClose(ws, code, reason);

		if (clientId) {
			// Do not wait for the unsubscribe to complete
			unsubscribeTopics(this.db, clientId);
		}

		// Broadcast device list update to all devices
		// Do not wait for the broadcast to complete
		broadcastDeviceListUpdate(this.httpServerContext(), this.wsHandler);
	}

	async webSocketError(ws: WebSocket, error: Error): Promise<void> {
		// Delegate to the WebSocket handler
		this.wsHandler.handleError(ws, error);
	}
}

function withMediaCors(request: Request, response: Response): Response {
	const origin = request.headers.get('Origin');
	if (!origin) {
		return response;
	}

	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', origin);
	headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
	headers.set('Vary', 'Origin');
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Handle WebSocket upgrade requests
		if (request.headers.get('Upgrade') === 'websocket' || url.pathname === '/ws') {
			const intention = parseIntention(request);
			if (!intention) {
				return new Response('Invalid request', { status: 400 });
			}
			const { roomId } = intention;

			// Create a `DurableObjectId` for the WebSocket
			const id: DurableObjectId = env.WEBSOCKET_HIBERNATION_SERVER.idFromName(roomId);

			// Create a stub to open a communication channel with the Durable Object instance
			const stub = env.WEBSOCKET_HIBERNATION_SERVER.get(id);

			// Forward the request to the Durable Object
			return stub.fetch(request);
		}

		if (url.pathname.startsWith('/media/')) {
			if (request.method === 'OPTIONS') {
				return withMediaCors(request, new Response(null, { status: 204 }));
			}

			const roomId = url.searchParams.get('roomId');
			if (!roomId) {
				return withMediaCors(request, new Response('Missing roomId', { status: 400 }));
			}

			// Photo GETs go through CachedMedia so Workers Cache can serve HITs without
			// re-entering the Durable Object. CORS is applied here on the gateway so
			// cached responses still get a correct Access-Control-Allow-Origin.
			if (request.method === 'GET' && url.pathname === '/media/photo') {
				const response = await ctx.exports.CachedMedia.fetch(request);
				return withMediaCors(request, response);
			}

			const id: DurableObjectId = env.WEBSOCKET_HIBERNATION_SERVER.idFromName(roomId);
			const stub = env.WEBSOCKET_HIBERNATION_SERVER.get(id);
			const response = await stub.handleMediaRequest(request);
			return withMediaCors(request, response);
		}

		if (url.pathname === '/join') {
			const roomId = url.searchParams.get('roomId');
			const assetResponse = await env.ASSETS.fetch(request);

			if (!roomId) {
				return assetResponse;
			}

			// Create a `DurableObjectId` for the WebSocket
			const id: DurableObjectId = env.WEBSOCKET_HIBERNATION_SERVER.idFromName(roomId);

			// Create a stub to open a communication channel with the Durable Object instance
			const stub = env.WEBSOCKET_HIBERNATION_SERVER.get(id);
			const metadata = await stub.getMetadata();

			if (!metadata) {
				return assetResponse;
			}

			const eventName = metadata.eventName;
			const sku = metadata.robotEventsSku;
			const divisionId = metadata.divisionId;
			let description = `You have been invited to ${eventName}. Division: ${divisionId}`;
			if (sku) {
				description += `. Event Code: ${sku}`;
			}

			return new HTMLRewriter()
				.on("meta[name='description']", {
					element(element) {
						element.setAttribute('content', description);
					}
				})
				.transform(assetResponse);
		}

		// Handle other requests (health check, etc.)
		return new Response('WRPC Server is running', { status: 200 });
	}
} satisfies ExportedHandler<Env>;
