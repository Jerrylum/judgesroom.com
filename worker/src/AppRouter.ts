import { z } from 'zod';
import { wRPC } from './wrpc';

const wrpc = new wRPC();

export const appRouter = wrpc.router({
	getName: wrpc.procedure.input(z.array(z.string())).query(async ({ input }) => {
		const [name] = input;
		return `Hello, ${name}!`;
	}),

	setAge: wrpc.procedure.input(z.array(z.number())).mutation(async ({ input }) => {
		const [age] = input;
		return `You are ${age} years old!`;
	}),

	updateInterests: wrpc.procedure.subscribe(async ({ input }) => {
		return ['Svelte', 'TypeScript'];
	})
});

export type AppRouter = typeof appRouter;
