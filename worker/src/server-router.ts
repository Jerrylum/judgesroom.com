import { initWRPC } from '@jerrylum/wrpc/server';
import { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import type { Authentication } from './access/authentication';
import type { JudgesRoomNetwork } from './network/judges-room-network';
import { buildHandshakeRoute } from './routes/handshake';
import { buildTeamRoute } from './routes/team';
import { buildJudgeRoute } from './routes/judge';
import { buildJudgingRoute } from './routes/judging';
import { buildEssentialRoute } from './routes/essential';
import { buildDeviceRoute } from './routes/device';
import { buildMediaRoute } from './routes/media';
import { buildAccessRoute } from './routes/access';
import type { PhotosBucket } from './media/types';

export interface ServerContext {
	db: DrizzleSqliteDODatabase;
	network: JudgesRoomNetwork;
	photos: PhotosBucket;
	auth: Authentication;
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
	device: buildDeviceRoute(w),
	media: buildMediaRoute(w),
	access: buildAccessRoute(w)
});

export { serverRouter };

/**
 * Type definition for the server router
 * Used by client-side code to get type-safe server procedure calls
 */
export type ServerRouter = typeof serverRouter;
