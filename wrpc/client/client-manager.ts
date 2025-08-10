import type { AnyRouter } from '../server/router';
import { createWRPCClient } from './client-factory';
import type { WRPCClient, ClientOptions } from './types';

/**
 * Generic client manager for WRPC connections
 * This provides a reusable pattern for managing client instances
 */
export class WRPCClientManager<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter> {
	private clientInstance: WRPCClient<TServerRouter> | null = null;

	constructor(
		private createOptions: () => ClientOptions,
		private clientRouter: TClientRouter
	) {}

	/**
	 * Get or create the WRPC client instance
	 */
	getClient(): WRPCClient<TServerRouter> {
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
			const client = this.clientInstance as WRPCClient<TServerRouter> & { disconnect?: () => void };
			if (client.disconnect && typeof client.disconnect === 'function') {
				client.disconnect();
			}
		}
		this.clientInstance = null;
	}

	/**
	 * Check if the client is connected (if implemented in the future)
	 */
	isConnected(): boolean {
		// This could be enhanced to check the actual connection status
		return this.clientInstance !== null;
	}
}

/**
 * Create a client manager with the given configuration
 */
export function createClientManager<TServerRouter extends AnyRouter, TClientRouter extends AnyRouter>(
	createOptions: () => ClientOptions,
	clientRouter: TClientRouter
): WRPCClientManager<TServerRouter, TClientRouter> {
	return new WRPCClientManager(createOptions, clientRouter);
}
