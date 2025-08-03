import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { createWebSocketHandler } from './wrpc/websocketHandler';
import { appRouter } from './router';
import type { WRPCRequest, WRPCResponse } from './wrpc/types';

const IntentionSchema = z.object({
	sessionId: z.uuidv4(),
	clientId: z.uuidv4(),
	deviceName: z.string().min(1).max(20),
	action: z.enum(['create', 'join', 'rejoin'])
});

type Intention = z.infer<typeof IntentionSchema>;

/** A Durable Object's behavior is defined in an exported Javascript class */
export class WebSocketHibernationServer extends DurableObject<Env> {
	private wsHandler = createWebSocketHandler({
		router: appRouter,
		onError: (opts) => {
			console.error('WRPC Error:', opts.error.message, opts.error);
		},
	});

	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const sessionId = url.searchParams.get('sessionId');
		const clientId = url.searchParams.get('clientId');
		const deviceName = url.searchParams.get('deviceName');
		const action = url.searchParams.get('action');

		const intention = IntentionSchema.parse({ sessionId, clientId, deviceName, action });

		// Creates two ends of a WebSocket connection.
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		if (!client || !server) {
			return new Response('Failed to create WebSocket pair', { status: 500 });
		}

		await this.handleWebSocket(server, intention);

		return new Response(null, { status: 101, webSocket: client });
	}

	private async handleWebSocket(ws: WebSocket, intention: Intention) {
		const { sessionId, clientId, deviceName, action } = intention;

		// Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
		// request within the Durable Object. It has the effect of "accepting" the connection,
		// and allowing the WebSocket to send and receive messages.
		// Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
		// is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
		// the connection is open. During periods of inactivity, the Durable Object can be evicted
		// from memory, but the WebSocket connection will remain open. If at some later point the
		// WebSocket receives a message, the runtime will recreate the Durable Object
		// (run the `constructor`) and deliver the message to the appropriate handler.
		this.ctx.acceptWebSocket(ws, [clientId]);

		// Set up connection with the WebSocket handler
		this.wsHandler.handleConnection(ws, {
			sessionId,
			clientId,
			deviceName,
		});
	}

	async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
		// Convert ArrayBuffer to string if necessary
		const messageStr = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage);
		
		// Delegate to the WebSocket handler
		await this.wsHandler.handleMessage(ws, messageStr);
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
		// Delegate to the WebSocket handler
		this.wsHandler.handleClose(ws, code, reason);
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
			// Create a `DurableObjectId` for the WebSocket session
			const sessionId = url.searchParams.get('sessionId') || 'default';
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
