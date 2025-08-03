import { createWRPCClient } from './wrpc-client';
import type { AppRouter } from '@judging.jerryio/worker/src/router';
import type { InferClient } from '@judging.jerryio/worker/src/types';
import { generateUUID, getDeviceNameFromUserAgent } from './utils.svelte';

// Global client instance
let clientInstance: InferClient<AppRouter> | null = null;

/**
 * Get or create the WRPC client instance
 */
export function useWRPC(): InferClient<AppRouter> {
  if (!clientInstance) {
    // Determine the WebSocket URL based on the current environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // In production, this would connect to your Cloudflare Worker
    // For development, you might need to adjust this URL
    const wsUrl = `${protocol}//${host}/ws`;
    
    // Generate a client ID for this session
    const clientId = generateUUID();
    const sessionId = generateUUID();
    const deviceName = getDeviceNameFromUserAgent();

    clientInstance = createWRPCClient<AppRouter>({
      wsUrl,
      clientId,
      sessionId,
      deviceName,
    });
  }

  return clientInstance;
}

/**
 * Reset the WRPC client (useful for testing or logout)
 */
export function resetWRPCClient(): void {
  if (clientInstance) {
    // If the client has a disconnect method, call it
    const client = clientInstance as InferClient<AppRouter> & { disconnect?: () => void };
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