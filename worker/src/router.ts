import { z } from 'zod';
import { initWRPC } from './wrpc/initWRPC';

const w = initWRPC.create();

export const appRouter = w.router({
	getName: w.procedure.input(z.string()).query(async ({ input }) => {
		return `Hello, ${input}!`;
	}),

	setAge: w.procedure.input(z.number()).mutation(async ({ input }) => {
		return `You are ${input} years old!`;
	}),

	// updateInterests: w.procedure.subscribe(async ({ input }) => {
	// 	return ['Svelte', 'TypeScript'];
	// })
});

export type AppRouter = typeof appRouter;
