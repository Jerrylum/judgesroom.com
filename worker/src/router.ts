import { z } from 'zod';
import { wrpc } from './wrpc/wrpc';

export const appRouter = wrpc.router({
	getName: wrpc.procedure.input(z.string()).query(async ({ input }) => {
		return `Hello, ${input}!`;
	}),

	setAge: wrpc.procedure.input(z.number()).mutation(async ({ input }) => {
		return `You are ${input} years old!`;
	}),

	updateInterests: wrpc.procedure.subscribe(async ({ input }) => {
		return ['Svelte', 'TypeScript'];
	})
});

export type AppRouter = typeof appRouter;
