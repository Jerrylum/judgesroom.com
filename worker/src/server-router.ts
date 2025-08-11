import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/server';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import type { Session } from '@judging.jerryio/wrpc/server';

// Initialize WRPC server
const w = initWRPC.createServer();

/**
 * Server router defines procedures that clients can call
 * These are the API endpoints available to connected clients
 */
const serverRouter = w.router({
	/**
	 * Simple query that returns a greeting
	 */
	getName: w.procedure.input(z.string()).query(async ({ input }: { input: string }) => {
		console.log('👋 Server getName called with:', input);
		return `Hello from server, ${input}!`;
	}),

	/**
	 * Returns the current server time
	 */
	getServerTime: w.procedure.query(async () => {
		return new Date().toISOString();
	}),

	/**
	 * Sets age and demonstrates server-to-client communication
	 */
	setAge: w.procedure.input(z.number()).mutation(async ({ input, session }: { input: number; session: Session<never> }) => {
		console.log('🎂 Server setAge called with:', input);
		
		// Broadcast age update to all connected clients
		await session.broadcast<ClientRouter>().updateAge.mutation(input);

		return `Server: You are ${input} years old! Update sent to all clients.`;
	}),

	/**
	 * Send notification to all clients
	 */
	broadcastNotification: w.procedure.input(z.string()).mutation(async ({ input, session }: { input: string; session: Session<never> }) => {
		console.log('📢 Broadcasting notification:', input);
		
		await session.broadcast<ClientRouter>().receiveNotification.mutation(input);
		return `Notification "${input}" sent to all clients`;
	}),

	/**
	 * Get a personalized message from a specific client
	 */
	getClientGreeting: w.procedure.input(z.object({
		clientId: z.string(),
		message: z.string()
	})).mutation(async ({ input, session }: { input: { clientId: string; message: string }; session: Session<never> }): Promise<string> => {
		console.log('💬 Getting greeting from client:', input.clientId);
		
		try {
			const response: string = await session.getClient<ClientRouter>(input.clientId)
				.getPersonalGreeting.query(input.message);
			return `Client ${input.clientId} responded: ${response}`;
		} catch (error) {
			return `Failed to get greeting from client ${input.clientId}: ${error}`;
		}
	})
});

export { serverRouter };

/**
 * Type definition for the server router
 * Used by client-side code to get type-safe server procedure calls
 */
export type ServerRouter = typeof serverRouter;

