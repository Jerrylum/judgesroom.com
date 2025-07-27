import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';

const IntentionSchema = z.object({
	sessionId: z.uuidv4(),
	clientId: z.uuidv4(),
	deviceName: z.string().min(1).max(20),
	action: z.enum(['create', 'join', 'rejoin'])
});

type Intention = z.infer<typeof IntentionSchema>;

/** A Durable Object's behavior is defined in an exported Javascript class */
export class WebSocketHibernationServer extends DurableObject<Env> {
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
		// TODO: Implement
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
		// TODO: Implement
	}

	async webSocketError(ws: WebSocket, error: Error): Promise<void> {
		// TODO: Implement
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
		// Create a `DurableObjectId` for an instance of the `MyDurableObject`
		// class named "foo". Requests from all Workers to the instance named
		// "foo" will go to a single globally unique Durable Object instance.
		const id: DurableObjectId = env.WEBSOCKET_HIBERNATION_SERVER.idFromName('foo');

		// Create a stub to open a communication channel with the Durable
		// Object instance.
		const stub = env.WEBSOCKET_HIBERNATION_SERVER.get(id);

		// Call the `sayHello()` RPC method on the stub to invoke the method on
		// the remote Durable Object instance
		const greeting = await stub.sayHello('world');

		return new Response(greeting);
	}
} satisfies ExportedHandler<Env>;
