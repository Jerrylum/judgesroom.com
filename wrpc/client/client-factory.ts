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
							if (key === 'query' || key === 'mutation') {
								// Create a function that can be called
								const fn = (input: unknown) => {
									return key === 'query'
										? client.query(currentParts.join('.'), input)
										: client.mutation(currentParts.join('.'), input);
								};

								// Wrap it in a proxy to allow property access for traversal
								return new Proxy(fn, {
									get(_target, nestedProp: string | symbol) {
										if (typeof nestedProp === 'symbol') return undefined;
										// Continue traversal by treating it as a path segment
										return createPathProxy([...currentParts, key, nestedProp]);
									},
									apply(_target, _thisArg, args: unknown[]) {
										return fn(args[0]);
									}
								});
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
