import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/client';
import { clientHandlers } from './client-state';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';

const w = initWRPC.createClient<ServerRouter>();

export const clientRouter = w.router({
	getName: w.procedure.input(z.string()).query(async ({ input }) => {
		return `Hello, ${input}!`;
	}),

	updateAge: w.procedure.input(z.number()).mutation(async ({ session, input }) => {
		// Handle the server's call to update age
		clientHandlers.onUpdateAge(input);
		return `Age updated to ${input}`;
	})

	// updateInterests: w.procedure.subscribe(async ({ input }) => {
	// 	return ['Svelte', 'TypeScript'];
	// })
});

export type ClientRouter = typeof clientRouter;
