import type { AnyProcedure } from './procedure';
import type { AnyRouter } from './router';
import type { InferClientType, RouterProxy, WRPCRequest, WRPCResponse } from './types';

/**
 * Session interface for server-to-client communication
 */
export interface Session<TServerRouter extends AnyRouter> {
	/**
	 * Get a client proxy to call procedures on a specific client
	 */
	getClient<TClientRouter extends AnyRouter>(clientId: string): RouterProxy<TClientRouter>;

	/**
	 * Broadcast proxy to call procedures on all connected clients
	 */
	broadcast<TClientRouter extends AnyRouter>(): RouterProxy<TClientRouter>;

	getServer(): RouterProxy<TServerRouter>;

	/**
	 * Current session metadata
	 */
	readonly sessionId: string;

	/**
	 * Current client metadata
	 */
	readonly currentClient: {
		clientId: string;
		deviceName: string;
	};
}

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
export type SessionFactory<TServerRouter extends AnyRouter> = (
	connectionManager: ConnectionManager,
	sessionId: string,
	clientId: string,
	deviceName?: string
) => Session<TServerRouter>;

/**
 * Create a session instance
 */
export function createServerSideSession(
	connectionManager: ConnectionManager,
	sessionId: string,
	clientId: string,
	deviceName: string
): Session<never> {
	/**
	 * Create a client proxy that can call procedures on the client
	 */
	function createClientProxy<TClientRouter extends AnyRouter>(targetClientId?: string): RouterProxy<TClientRouter> {
		return new Proxy({} as RouterProxy<TClientRouter>, {
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
		broadcast: () => createClientProxy(), // No specific client ID = broadcast
		getServer: () => {
			throw new Error('Not implemented');
		},
		sessionId,
		currentClient: {
			clientId,
			deviceName
		}
	};
}
