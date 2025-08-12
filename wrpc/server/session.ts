import type { AnyRouter } from './router';
import type { RouterBroadcastProxy, RouterProxy } from './types';
import type { WRPCRequest } from './messages';
import type { Network } from './types';

/**
 * Session interface for server-to-client communication
 * 
 * Server-side sessions can call client procedures but cannot call server procedures.
 * Client-side sessions can call server procedures but cannot call client procedures or broadcast.
 */
export interface Session<TServerRouter extends AnyRouter> {
	/**
	 * Get a client proxy to call procedures on a specific client
	 * @throws Error when called from client-side session
	 */
	getClient<TClientRouter extends AnyRouter>(clientId: string): RouterProxy<TClientRouter>;

	/**
	 * Broadcast proxy to call procedures on all connected clients
	 * @throws Error when called from client-side session
	 */
	broadcast<TClientRouter extends AnyRouter>(): RouterBroadcastProxy<TClientRouter>;

	/**
	 * Get a server proxy to call procedures on the server
	 * @throws Error when called from server-side session
	 */
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
 * Session factory function type
 */
export type SessionFactory<TServerRouter extends AnyRouter> = (
	connectionManager: Network,
	sessionId: string,
	clientId: string,
	deviceName?: string
) => Session<TServerRouter>;

/**
 * Create a session instance
 */
export function createServerSideSession(
	connectionManager: Network,
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
										const response = await connectionManager.sendToClient(targetClientId, request);
										if (response.result.type === 'data') {
											return response.result.data;
										} else {
											throw new Error(response.result.error.message);
										}
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
			throw new Error('getServer() cannot be called from server-side session. Server procedures should be called directly.');
		},
		sessionId,
		currentClient: {
			clientId,
			deviceName
		}
	};
}
