import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { createWebSocketHandler } from '@judging.jerryio/wrpc/server';
import { ServerRouter, serverRouter } from './server-router';
import { drizzle, DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import migrations from '../drizzle/migrations';
import { broadcastDeviceListUpdate } from './routes/device';
import { unsubscribeJudgeGroupTopics } from './routes/subscriptions';

const IntentionSchema = z.object({
	sessionId: z.uuidv4(),
	clientId: z.uuidv4(),
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(20),
	action: z.enum(['create', 'join', 'rejoin'])
});

type Intention = z.infer<typeof IntentionSchema>;

function parseIntention(request: Request): Intention | null {
	const url = new URL(request.url);
	const result = IntentionSchema.safeParse({
		sessionId: url.searchParams.get('sessionId'),
		clientId: url.searchParams.get('clientId'),
		deviceId: url.searchParams.get('deviceId'),
		deviceName: url.searchParams.get('deviceName'),
		action: url.searchParams.get('action')
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
		destroy: () => this.ctx.storage.deleteAll(),
		getWebSocket: (clientId) => this.ctx.getWebSockets(clientId)[0] || null,
		getClientIdByWebSocket: (ws) => this.ctx.getTags(ws)[0] || null,
		onError: (opts) => {
			console.error('WRPC Error:', opts.error.message, opts.error);
		}
	});
	private db: DrizzleSqliteDODatabase;

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

		// Make sure all migrations complete before accepting queries.
		// Otherwise you will need to run `this.migrate()` in any function
		// that accesses the Drizzle database `this.db`.
		ctx.blockConcurrencyWhile(async () => {
			await migrate(this.db, migrations);
		});
	}

	async fetch(request: Request): Promise<Response> {
		const intention = parseIntention(request);
		if (!intention) {
			return new Response('Invalid request', { status: 400 });
		}
		const { sessionId, clientId, deviceId, deviceName } = intention;

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

		// Set up connection with the WebSocket handler (now async for storage)
		await this.wsHandler.handleConnection(server, { sessionId, clientId, deviceId, deviceName });

		// We do not broadcast device list update here, it will be done when the device sends a join request

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
		// Convert ArrayBuffer to string if necessary
		const messageStr = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage);

		// The connection manager will handle finding the right client based on the WebSocket
		const messageCtx = { db: this.db, network: this.wsHandler.connectionManager };
		await this.wsHandler.handleMessage(ws, messageStr, messageCtx);
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
		// Delegate to the WebSocket handler
		const clientId = await this.wsHandler.handleClose(ws, code, reason);

		if (clientId) {
			// Do not wait for the unsubscribe to complete
			unsubscribeJudgeGroupTopics(this.db, clientId);
		}

		// Broadcast device list update to all devices
		// Do not wait for the broadcast to complete
		broadcastDeviceListUpdate(this.db, this.wsHandler.connectionManager, this.wsHandler.broadcast());
	}

	async webSocketError(ws: WebSocket, error: Error): Promise<void> {
		// Delegate to the WebSocket handler
		this.wsHandler.handleError(ws, error);
	}
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
			const { sessionId } = intention;

			// Create a `DurableObjectId` for the WebSocket session
			const id: DurableObjectId = env.WEBSOCKET_HIBERNATION_SERVER.idFromName(sessionId);

			// Create a stub to open a communication channel with the Durable Object instance
			const stub = env.WEBSOCKET_HIBERNATION_SERVER.get(id);

			// Forward the request to the Durable Object
			return stub.fetch(request);
		}

		// Handle other requests (health check, etc.)
		return new Response('WRPC Server is running', { status: 200 });
	}
} satisfies ExportedHandler<Env>;
