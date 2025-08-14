import type { WRPCRequest } from '../server/messages';
import type { AnyRouter } from '../server/router';
import type { InferRouterContext, RouterProxy } from '../server/types';

/**
 * Client-specific types for WRPC
 */

export type WRPCClient<TRouter extends AnyRouter> = RouterProxy<TRouter>;

export interface ClientOptions<TRouter extends AnyRouter> {
	wsUrl: string;
	sessionId: string;
	clientId: string;
	deviceName?: string;
	onContext: (request: WRPCRequest) => Promise<InferRouterContext<TRouter>>;
}

export interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}
