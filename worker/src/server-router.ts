import { initWRPC } from '@judging.jerryio/wrpc/server';
import { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { handshake } from './routes/handshake';
import { team } from './routes/team';
import { judge } from './routes/judge';
import { judging } from './routes/judging';
import { essential } from './routes/essential';
import { client } from './routes/client';

export interface ServerContext {
	db: DrizzleSqliteDODatabase;
	destroySession: () => Promise<void>;
	// Note: Network access might be added here in a full implementation
	// network: Network;
}

export type Transaction = Parameters<Parameters<DrizzleSqliteDODatabase['transaction']>[0]>[0];
export type DatabaseOrTransaction = DrizzleSqliteDODatabase | Transaction;

// Initialize WRPC server
export const w = initWRPC.createServer<ServerContext>();

/*
TODO, for human:

- destroySession
*/

/**
 * Server router defines procedures that clients can call
 * These are the API endpoints available to connected clients
 */
const serverRouter = w.router({
	handshake,
	essential,
	team,
	judge,
	judging,
	client,
});

export { serverRouter };

/**
 * Type definition for the server router
 * Used by client-side code to get type-safe server procedure calls
 */
export type ServerRouter = typeof serverRouter;
