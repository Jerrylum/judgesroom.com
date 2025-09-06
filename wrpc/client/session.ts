import type { AnyRouter, RouterProxy, Session } from '../server';
import type { WebsocketClient } from './websocket-client';

/**
 * Create a session instance
 */
export function createClientSideSession<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter>(
	wsClient: WebsocketClient<TClientRouter>,
	sessionId: string,
	clientId: string,
	deviceName: string
): Session<TServerRouter> {
	/**
	 * Create a client proxy that can call procedures on the client
	 */
	function createServerProxy(pathParts: string[] = []) {
		return new Proxy({} as RouterProxy<TServerRouter>, {
			get(_target, prop: string) {
				if (prop === 'query') {
					return (input: unknown) => wsClient.query(pathParts.join('.'), input);
				}
				if (prop === 'mutation') {
					return (input: unknown) => wsClient.mutation(pathParts.join('.'), input);
				}
				return createServerProxy([...pathParts, prop]);
			}
		});
	}

	return {
		getClient: (clientId: string) => {
			throw new Error('getClient() cannot be called from client-side session. Clients cannot call other clients directly.');
		},
		broadcast: () => {
			throw new Error('broadcast() cannot be called from client-side session. Clients cannot broadcast to other clients.');
		},
		getServer: () => createServerProxy(),
		sessionId,
		currentClient: {
			clientId,
			deviceName
		}
	};
}
