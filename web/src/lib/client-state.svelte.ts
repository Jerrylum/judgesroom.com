/**
 * Client-side state management for WRPC
 * Provides reactive state updates when server calls client procedures
 */
import type { EssentialData } from '@judging.jerryio/protocol/src/event';
import type { ClientInfo } from '@judging.jerryio/protocol/src/client';
import { app } from './app-page.svelte';

interface ClientState {
	// Placeholder for future client state if needed
	// Currently all state is managed by the App class
	placeholder?: never;
}

// Reactive state store for client-side data
export const clientState: ClientState = $state({
	// Currently empty - App class manages all state
});

// Handlers for server-to-client procedure calls
export const clientHandlers = {
	onEssentialDataUpdate: (data: EssentialData) => {
		console.log(`📊 Essential data updated:`, data);
		app.handleEssentialDataUpdate(data);
	},

	onClientListUpdate: (clients: ClientInfo[]) => {
		console.log(`👥 Client list updated:`, clients);
		app.handleClientListUpdate(clients);
	}
};
