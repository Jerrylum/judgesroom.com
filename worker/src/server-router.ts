import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/server';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';

const w = initWRPC.createServer<ClientRouter>();

export const serverRouter = w.router({
	getName: w.procedure.input(z.string()).query(async ({ input }) => {
		console.log('getName', input);

		return `Hello, ${input}!`;
	}),

	setAge: w.procedure.input(z.number()).mutation(async ({ input, session }) => {
		// Server can now call client procedures
		// await session.getClient('some-client-id').updateAge.mutation(input);

		// Or broadcast to all clients
		await session.broadcast.updateAge.mutation(input);

		return `You are ${input} years old!`;
	})

	// updateInterests: w.procedure.subscribe(async ({ input }) => {
	// 	return ['Svelte', 'TypeScript'];
	// })
});

export type ServerRouter = typeof serverRouter;

