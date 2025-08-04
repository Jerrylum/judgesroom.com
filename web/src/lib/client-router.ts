import { z } from 'zod';
import { initWRPC } from '../../../worker/src/wrpc/initWRPC';
import type { ServerRouter } from '../../../worker/src/server-router';
import { clientHandlers } from './client-state';

const w = initWRPC.create();

export const clientRouter = w.router({
	getName: w.procedure.input(z.string()).query(async ({ input }) => {
		return `Hello, ${input}!`;
	}),

	updateAge: w.procedure.input(z.number()).mutation(async ({ input }) => {
		// Handle the server's call to update age
		clientHandlers.onUpdateAge(input);
		return `Age updated to ${input}`;
	}),

	// updateInterests: w.procedure.subscribe(async ({ input }) => {
	// 	return ['Svelte', 'TypeScript'];
	// })
});

export type ClientRouter = typeof clientRouter;
