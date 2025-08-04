import { createWRPCClient, WebsocketClient } from './wrpc-client';
import type { ServerRouter } from '../../../worker/src/server-router';
import type { ClientRouter } from './client-router';
import { clientRouter } from './client-router';
import { generateUUID, getDeviceNameFromUserAgent } from './utils.svelte';

// Global client instance
let clientInstance: ReturnType<typeof createWRPCClient<ServerRouter, ClientRouter>> | null = null;

/**
 * Get or create the WRPC client instance
 */
export function useWRPC() {
  if (!clientInstance) {
    // Determine the WebSocket URL based on the current environment
    const isDevelopment = import.meta.env.DEV;
    const wsUrl = isDevelopment ? 'ws://localhost:8787/ws' : 'wss://judging.jerryio.workers.dev/ws';
    
    // Generate a client ID for this session
    const clientId = generateUUID();
    const sessionId = generateUUID();
    const deviceName = getDeviceNameFromUserAgent();

    clientInstance = createWRPCClient<ServerRouter, ClientRouter>({
      wsUrl,
      clientId,
      sessionId,
      deviceName,
    }, clientRouter);
  }

  return clientInstance;
}

/**
 * Reset the WRPC client (useful for testing or logout)
 */
export function resetWRPCClient(): void {
  if (clientInstance) {
    // If the client has a disconnect method, call it
    const client = clientInstance as ReturnType<typeof createWRPCClient<ServerRouter, ClientRouter>> & { disconnect?: () => void };
    if (client.disconnect && typeof client.disconnect === 'function') {
      client.disconnect();
    }
  }
  clientInstance = null;
}

/**
 * Check if the client is connected (if implemented in the future)
 */
export function isWRPCConnected(): boolean {
  // This could be enhanced to check the actual connection status
  return clientInstance !== null;
}