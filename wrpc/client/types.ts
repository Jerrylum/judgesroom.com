import type { AnyProcedure } from '../server/procedure';
import type { AnyRouter } from '../server/router';
import type { RouterProxy } from '../server/types';

/**
 * Client-specific types for WRPC
 */

export type WRPCClient<TRouter extends AnyRouter> = RouterProxy<TRouter>;

export interface ClientOptions {
	wsUrl: string;
	sessionId?: string;
	clientId?: string;
	deviceName?: string;
}

export interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}
