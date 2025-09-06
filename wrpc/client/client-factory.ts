import type { AnyRouter } from '../server/router';
import { WebsocketClient } from './websocket-client';
import type { WRPCClient, ClientOptions } from './types';

/**
 * Create a type-safe WRPC client proxy
 */
export function createWRPCClient<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter>(
	options: ClientOptions<TClientRouter>,
	clientRouter: TClientRouter
): [WebsocketClient<TClientRouter>, WRPCClient<TServerRouter>] {
	const client = new WebsocketClient<TClientRouter>(options, clientRouter);

	const wrpc = new Proxy({} as WRPCClient<TServerRouter>, {
		get(_target, prop: string | symbol) {
			const pathParts: string[] = [];
			function createPathProxy(currentParts: string[]): unknown {
				return new Proxy(
					{},
					{
						get(_t, key: string | symbol) {
							if (typeof key === 'symbol') return undefined;
							if (key === 'constructor') return undefined;
							if (key === 'query') {
								return (input: unknown) => client.query(currentParts.join('.'), input);
							}
							if (key === 'mutation') {
								return (input: unknown) => client.mutation(currentParts.join('.'), input);
							}
							return createPathProxy([...currentParts, key]);
						}
					}
				);
			}

			if (typeof prop === 'symbol') return undefined;
			return createPathProxy([prop]);
		}
	});

	return [client, wrpc];
}
