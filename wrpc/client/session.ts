import type { AnyRouter, RouterProxy, Session } from '../server';
import type { WebsocketClient } from './websocket-client';

/**
 * Create a session instance
 */
export function createClientSideSession<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter>(
	wsClient: WebsocketClient<TServerRouter, TClientRouter>,
	sessionId: string,
	clientId: string,
	deviceName: string
): Session<TServerRouter> {
	/**
	 * Create a client proxy that can call procedures on the client
	 */
	function createServerProxy() {
		return new Proxy({} as RouterProxy<TServerRouter>, {
			get(target, prop: string) {
				return new Proxy(
					{},
					{
						get(target, method: string) {
							if (method === 'query') {
								return (input: unknown) => wsClient.query(prop, input);
							} else if (method === 'mutation') {
								return (input: unknown) => wsClient.mutation(prop, input);
							}
							throw new Error(`Unknown method: ${method}`);
						}
					}
				);
			}
		});
	}

	return {
		getClient: (clientId: string) => {
			throw new Error('Not implemented');
		},
		broadcast: () => {
			throw new Error('Not implemented');
		}, // No specific client ID = broadcast
		getServer: () => createServerProxy(),
		sessionId,
		currentClient: {
			clientId,
			deviceName
		}
	};
}
