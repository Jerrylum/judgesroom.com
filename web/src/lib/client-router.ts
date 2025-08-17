import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/client';
import { clientHandlers } from './client-state.svelte';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';
import type { Session } from '@judging.jerryio/wrpc/server';
import { EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { ClientInfoSchema } from '@judging.jerryio/protocol/src/client';

// Initialize WRPC client with server router type
const w = initWRPC.createClient<ServerRouter>();

/**
 * Client router defines procedures that can be called by the server
 * These are the endpoints the server can invoke on this client
 */
const clientRouter = w.router({
	/**
	 * Server pushes essential data updates to client
	 */
	onEssentialDataUpdate: w.procedure.input(EssentialDataSchema).mutation(async ({ input }) => {
		clientHandlers.onEssentialDataUpdate(input);
		return `Essential data updated`;
	}),

	/**
	 * Server pushes client list updates to client
	 */
	onClientListUpdate: w.procedure.input(z.array(ClientInfoSchema)).mutation(async ({ input }) => {
		clientHandlers.onClientListUpdate(input);
		return `Client list updated`;
	})
});

export { clientRouter };

/**
 * Type definition for the client router
 * Used by server-side code to get type-safe client procedure calls
 */
export type ClientRouter = typeof clientRouter;
