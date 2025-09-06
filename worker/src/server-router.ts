import { initWRPC, Network } from '@judging.jerryio/wrpc/server';
import { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { buildHandshakeRoute } from './routes/handshake';
import { buildTeamRoute } from './routes/team';
import { buildJudgeRoute } from './routes/judge';
import { buildJudgingRoute } from './routes/judging';
import { buildEssentialRoute } from './routes/essential';
import { buildClientRoute } from './routes/client';

export interface ServerContext {
	db: DrizzleSqliteDODatabase;
	network: Network;
}

export type Transaction = Parameters<Parameters<DrizzleSqliteDODatabase['transaction']>[0]>[0];
export type DatabaseOrTransaction = DrizzleSqliteDODatabase | Transaction;

// Initialize WRPC server
export const w = initWRPC.createServer<ServerContext>();

/**
 * Server router defines procedures that clients can call
 * These are the API endpoints available to connected clients
 */
const serverRouter = w.router({
	handshake: buildHandshakeRoute(w),
	essential: buildEssentialRoute(w),
	team: buildTeamRoute(w),
	judge: buildJudgeRoute(w),
	judging: buildJudgingRoute(w),
	client: buildClientRoute(w)
});

export { serverRouter };

/**
 * Type definition for the server router
 * Used by client-side code to get type-safe server procedure calls
 */
export type ServerRouter = typeof serverRouter;
