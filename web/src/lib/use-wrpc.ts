import { createClientManager } from '@judging.jerryio/wrpc/client';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';
import type { ClientRouter } from './client-router';
import { clientRouter } from './client-router';
import { generateUUID, getDeviceNameFromUserAgent } from './utils.svelte';

// Create the client manager
const clientManager = createClientManager<ServerRouter, ClientRouter>(
  () => {
    // Determine the WebSocket URL based on the current environment
    const isDevelopment = import.meta.env.DEV;
    const wsUrl = isDevelopment ? 'ws://localhost:8787/ws' : 'wss://judging.jerryio.workers.dev/ws';
    
    // Generate a client ID for this session
    const clientId = generateUUID();
    const sessionId = "5cda73e1-c7e2-425a-82e6-ec3f32b4115f";
    const deviceName = getDeviceNameFromUserAgent();

    return {
      wsUrl,
      clientId,
      sessionId,
      deviceName,
    };
  },
  clientRouter
);

/**
 * Get or create the WRPC client instance
 */
export function useWRPC() {
  return clientManager.getClient();
}

/**
 * Reset the WRPC client (useful for testing or logout)
 */
export function resetWRPCClient(): void {
  clientManager.resetClient();
}

/**
 * Check if the client is connected (if implemented in the future)
 */
export function isWRPCConnected(): boolean {
  return clientManager.isConnected();
}