import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { WRPC } from './wrpc/wrpc';
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
	private wrpc: WRPC;
	private requestHandler: (request: WRPCRequest) => Promise<WRPCResponse>;
	private subscriptionHandler: (request: WRPCRequest) => AsyncGenerator<WRPCResponse>;
	private activeSubscriptions: Map<string, { ws: WebSocket; generator: AsyncGenerator<WRPCResponse> }> = new Map();

	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.wrpc = new WRPC();
		this.requestHandler = this.wrpc.createHandler(appRouter);
		this.subscriptionHandler = this.wrpc.createSubscriptionHandler(appRouter);
	}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param name - The name provided to a Durable Object instance from a Worker
	 * @returns The greeting to be sent back to the Worker
	 */
	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
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

		// TODO: Implement
	}

	async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
		try {
			// Convert ArrayBuffer to string if necessary
			const messageStr = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage);

			// Parse the WRPC request
			const request: WRPCRequest = JSON.parse(messageStr);

			if (request.type === 'subscription') {
				await this.handleSubscription(ws, request);
			} else {
				// Handle query and mutation
				const response = await this.requestHandler(request);
				ws.send(JSON.stringify(response));
			}
		} catch (error) {
			console.error('Error processing WebSocket message:', error);
			// Send error response if we can parse the request ID
			try {
				const request = JSON.parse(typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage));
				const errorResponse: WRPCResponse = {
					id: request.id || 'unknown',
					result: {
						type: 'error',
						error: {
							message: error instanceof Error ? error.message : 'Unknown error',
							code: 'MESSAGE_PARSE_ERROR'
						}
					}
				};
				ws.send(JSON.stringify(errorResponse));
			} catch {
				// If we can't even parse for an ID, send a generic error
				ws.send(
					JSON.stringify({
						id: 'unknown',
						result: {
							type: 'error',
							error: {
								message: 'Failed to parse message',
								code: 'MESSAGE_PARSE_ERROR'
							}
						}
					})
				);
			}
		}
	}

	private async handleSubscription(ws: WebSocket, request: WRPCRequest): Promise<void> {
		const subscriptionKey = `${request.id}`;

		// Clean up existing subscription if any
		const existing = this.activeSubscriptions.get(subscriptionKey);
		if (existing) {
			try {
				await existing.generator.return(undefined);
			} catch {
				// Ignore cleanup errors
			}
		}

		// Create new subscription
		const generator = this.subscriptionHandler(request);
		this.activeSubscriptions.set(subscriptionKey, { ws, generator });

		// Process subscription messages
		try {
			for await (const response of generator) {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(response));
				} else {
					// WebSocket is closed, cleanup subscription
					break;
				}

				// If this is a complete message, cleanup
				if (response.result?.type === 'complete') {
					break;
				}
			}
		} catch (error) {
			console.error('Error in subscription:', error);
			// Send error and cleanup
			if (ws.readyState === WebSocket.OPEN) {
				const errorResponse: WRPCResponse = {
					id: request.id,
					result: {
						type: 'error',
						error: {
							message: error instanceof Error ? error.message : 'Subscription error',
							code: 'SUBSCRIPTION_ERROR'
						}
					}
				};
				ws.send(JSON.stringify(errorResponse));
			}
		} finally {
			this.activeSubscriptions.delete(subscriptionKey);
		}
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
		// Cleanup any active subscriptions for this WebSocket
		for (const [key, subscription] of this.activeSubscriptions) {
			if (subscription.ws === ws) {
				try {
					await subscription.generator.return(undefined);
				} catch {
					// Ignore cleanup errors
				}
				this.activeSubscriptions.delete(key);
			}
		}
	}

	async webSocketError(ws: WebSocket, error: Error): Promise<void> {
		console.error('WebSocket error:', error);
		// Cleanup any active subscriptions for this WebSocket
		for (const [key, subscription] of this.activeSubscriptions) {
			if (subscription.ws === ws) {
				try {
					await subscription.generator.return(undefined);
				} catch {
					// Ignore cleanup errors
				}
				this.activeSubscriptions.delete(key);
			}
		}
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
