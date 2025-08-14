import type { AnyRouter } from '../server/router';
import { createWRPCClient } from './client-factory';
import type { WRPCClient, ClientOptions } from './types';
import type { WebsocketClient } from './websocket-client';

/**
 * Generic client manager for WRPC connections
 * This provides a reusable pattern for managing client instances
 */
export class WRPCClientManager<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter> {
	private clientInstance: [WebsocketClient<TClientRouter>, WRPCClient<TServerRouter>] | null = null;

	constructor(
		private createOptions: () => ClientOptions<TClientRouter>,
		private clientRouter: TClientRouter
	) {}

	/**
	 * Get or create the WRPC client instance
	 */
	getClient(): [WebsocketClient<TClientRouter>, WRPCClient<TServerRouter>] {
		if (!this.clientInstance) {
			this.clientInstance = createWRPCClient<TServerRouter, TClientRouter>(this.createOptions(), this.clientRouter);
		}
		return this.clientInstance;
	}

	/**
	 * Reset the WRPC client (useful for testing or logout)
	 */
	resetClient(): void {
		if (this.clientInstance) {
			// If the client has a disconnect method, call it
			const [client, _] = this.clientInstance;
			if (typeof client.disconnect === 'function') {
				client.disconnect();
			}
		}
		this.clientInstance = null;
	}

	/**
	 * Check if the client is connected
	 */
	isConnected(): boolean {
		return this.clientInstance !== null && this.clientInstance[0].isConnected();
	}
}

/**
 * Create a client manager with the given configuration
 */
export function createClientManager<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter>(
	createOptions: () => ClientOptions<TClientRouter>,
	clientRouter: TClientRouter
): WRPCClientManager<TServerRouter, TClientRouter> {
	return new WRPCClientManager(createOptions, clientRouter);
}
