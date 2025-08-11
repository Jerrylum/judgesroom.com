import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/client';
import { clientHandlers } from './client-state.svelte';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';
import type { Session } from '@judging.jerryio/wrpc/server';

// Initialize WRPC client with server router type
const w = initWRPC.createClient<ServerRouter>();

/**
 * Client router defines procedures that can be called by the server
 * These are the endpoints the server can invoke on this client
 */
const clientRouter = w.router({
	/**
	 * Server can call this to get a personalized greeting from the client
	 */
	getPersonalGreeting: w.procedure.input(z.string()).query(async ({ input }: { input: string }) => {
		return `Hello from client! You said: ${input}`;
	}),

	/**
	 * Server calls this when it wants to update the client's age display
	 */
	updateAge: w.procedure.input(z.number()).mutation(async ({ session, input }: { session: Session<ServerRouter>; input: number }) => {
		// Demonstrate calling server procedure from client procedure
		const serverResponse = await session.getServer().getServerTime.query();
		console.log('🕰️ Server time:', serverResponse);

		// Update local client state
		clientHandlers.onUpdateAge(input);
		return `Client: Age updated to ${input} at ${new Date().toLocaleTimeString()}`;
	}),

	/**
	 * Server can send notifications to this client
	 */
	receiveNotification: w.procedure.input(z.string()).mutation(async ({ input }: { input: string }) => {
		clientHandlers.onNotify(input);
		return `Notification received: ${input}`;
	}),

	/**
	 * Server notifies client about connected client count changes
	 */
	updateClientCount: w.procedure.input(z.number()).mutation(async ({ input }: { input: number }) => {
		clientHandlers.onClientCountUpdate(input);
		return `Client count updated: ${input}`;
	})
});

export { clientRouter };

/**
 * Type definition for the client router
 * Used by server-side code to get type-safe client procedure calls
 */
export type ClientRouter = typeof clientRouter;
