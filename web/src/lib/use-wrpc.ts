import { createClientManager } from '@judging.jerryio/wrpc/client';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';
import type { ClientRouter } from './client-router';
import { clientRouter } from './client-router';
import { generateUUID, getDeviceNameFromUserAgent } from './utils.svelte';

/**
 * WRPC Client Manager
 *
 * Creates and manages the WebSocket connection to the WRPC server.
 * Handles automatic reconnection, message routing, and type-safe RPC calls.
 */
const clientManager = createClientManager<ServerRouter, ClientRouter>(
	// Connection configuration factory
	() => {
		// Environment-based WebSocket URL selection
		const isDevelopment = import.meta.env.DEV;
		const wsUrl = isDevelopment
			? 'ws://localhost:8787/ws' // Local development server
			: 'wss://judging.jerryio.workers.dev/ws'; // Production Cloudflare Worker

		// Generate unique identifiers for this client session
		const clientId = generateUUID();
		const sessionId = '5cda73e1-c7e2-425a-82e6-ec3f32b4115f'; // Demo session ID
		const deviceName = getDeviceNameFromUserAgent();

		return {
			wsUrl,
			clientId,
			sessionId,
			deviceName
		};
	},
	clientRouter // Client-side procedure definitions
);

/**
 * Get the WRPC client instance for making server procedure calls
 *
 * Returns a type-safe proxy object that mirrors the server router structure.
 * All calls are automatically serialized, sent over WebSocket, and responses are deserialized.
 *
 * @returns Typed client proxy for calling server procedures
 */
export function useWRPC() {
	return clientManager.getClient()[1];
}

/**
 * Reset the WRPC client connection
 *
 * Closes the current WebSocket connection and clears any cached client state.
 * The next call to useWRPC() will create a fresh connection.
 * Useful for testing, logout scenarios, or handling connection errors.
 */
export function resetWRPCClient(): void {
	clientManager.resetClient();
}

/**
 * Check if the WRPC client is currently connected to the server
 *
 * @returns true if WebSocket connection is open and ready for communication
 */
export function isWRPCConnected(): boolean {
	return clientManager.isConnected();
}
