import type { WRPCRequest } from '../server/messages';
import type { AnyRouter } from '../server/router';
import type { InferRouterContext, RouterProxy } from '../server/types';
import type { ConnectionState } from './websocket-client';

/**
 * Client-specific types for WRPC
 */

export type WRPCClient<TRouter extends AnyRouter> = RouterProxy<TRouter>;

export interface ClientOptions<TRouter extends AnyRouter> {
	wsUrl: string;
	roomId: string;
	clientId: string;
	deviceId: string;
	deviceName?: string;
	onContext: (request: WRPCRequest) => Promise<InferRouterContext<TRouter>>;
	onOpen: () => void;
	onClosed: (code: number, reason: string) => void;
	onConnectionStateChange: (state: ConnectionState) => void;
}

export interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}
