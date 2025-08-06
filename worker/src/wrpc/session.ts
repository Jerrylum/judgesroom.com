import type { AnyProcedure } from './procedure';
import type { AnyRouter } from './router';
import type { WRPCRequest, WRPCResponse } from './types';

/**
 * Session interface for server-to-client communication
 */
export interface Session<TClientRouter extends AnyRouter = AnyRouter> {
	/**
	 * Get a client proxy to call procedures on a specific client
	 */
	getClient(clientId: string): ClientProxy<TClientRouter>;

	/**
	 * Broadcast proxy to call procedures on all connected clients
	 */
	broadcast: ClientProxy<TClientRouter>;

	/**
	 * Current session metadata
	 */
	sessionId: string;
	clientId: string;
	deviceName?: string;
}

type InputOutputFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

type InferClientType<TProcedure> = TProcedure extends {
	_def: { type: infer TType; $types: { input: infer TInput; output: infer TOutput } };
}
	? TType extends 'query'
		? { query: InputOutputFunction<TInput, TOutput> }
		: TType extends 'mutation'
			? { mutation: InputOutputFunction<TInput, TOutput> }
			: never
	: never;

/**
 * Client proxy type that mirrors the client router structure
 */
export type ClientProxy<TRouter extends AnyRouter> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends AnyProcedure
		? InferClientType<TRouter['_def']['record'][K]>
		: TRouter['_def']['record'][K] extends AnyRouter
			? ClientProxy<TRouter['_def']['record'][K]>
			: never;
};

/**
 * WebSocket connection manager interface
 */
export interface ConnectionManager {
	/**
	 * Send a request to a specific client
	 */
	sendToClient(clientId: string, request: WRPCRequest): Promise<WRPCResponse>;

	/**
	 * Broadcast a request to all connected clients
	 */
	broadcast(request: WRPCRequest): Promise<WRPCResponse[]>;

	/**
	 * Get all connected client IDs
	 */
	getConnectedClients(): string[];

	/**
	 * Check if a client is connected
	 */
	isClientConnected(clientId: string): boolean;
}

/**
 * Session factory function type
 */
export type SessionFactory<TClientRouter extends AnyRouter> = (
	connectionManager: ConnectionManager,
	sessionId: string,
	clientId: string,
	deviceName?: string
) => Session<TClientRouter>;

/**
 * Create a session instance
 */
export function createSession<TClientRouter extends AnyRouter>(
	connectionManager: ConnectionManager,
	sessionId: string,
	clientId: string,
	deviceName?: string
): Session<TClientRouter> {
	/**
	 * Create a client proxy that can call procedures on the client
	 */
	function createClientProxy(targetClientId?: string): ClientProxy<TClientRouter> {
		return new Proxy({} as ClientProxy<TClientRouter>, {
			get(target, prop: string) {
				return new Proxy(
					{},
					{
						get(target, method: string) {
							if (method === 'query' || method === 'mutation') {
								return async (input: unknown) => {
									const request: WRPCRequest = {
										kind: 'request',
										id: crypto.randomUUID(),
										type: method as 'query' | 'mutation',
										path: prop,
										input
									};

									if (targetClientId) {
										// Send to specific client
										return await connectionManager.sendToClient(targetClientId, request);
									} else {
										// Broadcast to all clients
										const responses = await connectionManager.broadcast(request);
										return responses; // Return array of responses for broadcast
									}
								};
							}

							// Handle nested router properties
							return createClientProxy(targetClientId);
						}
					}
				);
			}
		});
	}

	return {
		getClient: (clientId: string) => createClientProxy(clientId),
		broadcast: createClientProxy(), // No specific client ID = broadcast
		sessionId,
		clientId,
		deviceName
	};
}
