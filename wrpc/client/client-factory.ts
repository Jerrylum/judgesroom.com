import type { AnyRouter } from '../server/router';
import { WebsocketClient } from './websocket-client';
import type { WRPCClient, ClientOptions } from './types';

/**
 * Create a type-safe WRPC client proxy
 */
export function createWRPCClient<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter>(
	options: ClientOptions,
	clientRouter: TClientRouter
): [WebsocketClient<TClientRouter>, WRPCClient<TServerRouter>] {
	const client = new WebsocketClient<TClientRouter>(options, clientRouter);

	const wrpc = new Proxy({} as WRPCClient<TServerRouter>, {
		get(target, prop: string) {
			return new Proxy(
				{},
				{
					get(target, method: string | symbol) {
						if (typeof method === 'symbol') {
							return undefined;
						}
						if (method === 'constructor') {
							return undefined;
						}
						if (method === 'query') {
							return (input: unknown) => client.query(prop, input);
						} else if (method === 'mutation') {
							return (input: unknown) => client.mutation(prop, input);
						}
						throw new Error(`Unknown method: ${method}`);
					}
				}
			);
		}
	});

	return [client, wrpc];
}
