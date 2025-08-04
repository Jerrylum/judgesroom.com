/**
 * Simple global state management for client-side WRPC handlers 
 * This allows the client router to communicate with the UI
 */

interface ClientState {
  serverCallCount: number;
  lastUpdateAge: number;
}

// Simple reactive store
let state: ClientState = {
  serverCallCount: 0,
  lastUpdateAge: 0
};

let listeners: Array<(state: ClientState) => void> = [];

export function getClientState(): ClientState {
  return { ...state };
}

export function updateClientState(updates: Partial<ClientState>): void {
  state = { ...state, ...updates };
  listeners.forEach(listener => listener(state));
}

export function subscribeToClientState(callback: (state: ClientState) => void): () => void {
  listeners.push(callback);
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(listener => listener !== callback);
  };
}

// Handlers for server-to-client procedures
export const clientHandlers = {
  onUpdateAge: (age: number) => {
    console.log(`Server told me to update my age to ${age}`);
    updateClientState({
      serverCallCount: state.serverCallCount + 1,
      lastUpdateAge: age
    });
  }
};