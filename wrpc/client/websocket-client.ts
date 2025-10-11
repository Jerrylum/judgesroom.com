import { z } from 'zod';
import type { AnyProcedure } from '../server/procedure';
import type { ProcedureResolver } from '../server/procedure-builder';
import type { AnyRouter } from '../server/router';
import type { WRPCRequest, WRPCResponse } from '../server/messages';
import { parseWRPCMessage } from '../server/utils';
import { createClientSideSession } from './session';
import type { ClientOptions, PendingRequest } from './types';
import type { InferRouterContext } from '../server/types';
import type { Session } from '../server/session';

// ============================================================================
// Connection State
// ============================================================================

export const ConnectionStateSchema = z.enum(['offline', 'connecting', 'connected', 'reconnecting', 'error']);
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

export enum ConnectionCloseCode {
	NORMAL = 1000,
	KICKED = 3000,
	SESSION_DESTROYED = 3001
}

/**
 * WRPC WebSocket client implementation
 */
export class WebsocketClient<TClientRouter extends AnyRouter> {
	private connectingPromise: Promise<WebSocket> | null = null;
	private ws: WebSocket | null = null;
	private requestId = 0;
	private pendingRequests = new Map<string, PendingRequest>();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private clientRouter: TClientRouter;
	private _connectionState: ConnectionState = 'offline';

	private set connectionState(state: ConnectionState) {
		this._connectionState = state;
		this.options.onConnectionStateChange(state);
	}

	private get connectionState(): ConnectionState {
		return this._connectionState;
	}

	constructor(
		private options: ClientOptions<TClientRouter>,
		clientRouter: TClientRouter
	) {
		this.clientRouter = clientRouter;
	}

	private generateRequestId(): string {
		return `req_${++this.requestId}_${Date.now()}`;
	}

	private async connect(): Promise<WebSocket> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			return this.ws;
		}

		if (this.connectingPromise) {
			return this.connectingPromise;
		}

		this.connectionState = 'connecting';
		this.connectingPromise = new Promise((resolve, reject) => {
			const { wsUrl, roomId, clientId, deviceId, deviceName } = this.options;
			const url = new URL(wsUrl);

			url.searchParams.set('roomId', roomId);
			url.searchParams.set('clientId', clientId);
			url.searchParams.set('deviceId', deviceId);
			if (deviceName) url.searchParams.set('deviceName', deviceName);
			url.searchParams.set('action', 'join');

			const ws = new WebSocket(url.toString());

			ws.onopen = () => {
				this.ws = ws;
				this.handleOpen();
				resolve(ws);
			};

			ws.onerror = (error) => {
				this.connectionState = 'error';
				this.connectingPromise = null;
				console.error('WebSocket connection failed', error);
				reject(new Error(`WebSocket connection failed`));
			};

			ws.onmessage = (event) => {
				this.handleMessage(event.data);
			};

			ws.onclose = (event) => {
				this.handleClose(event);
			};
		});

		return this.connectingPromise;
	}

	private async handleOpen(): Promise<void> {
		this.reconnectAttempts = 0;
		this.connectionState = 'connected';
		this.connectingPromise = null;
		this.options.onOpen();
	}

	private async handleMessage(data: string): Promise<void> {
		try {
			// Parse and validate the message using Zod
			const parsedMessage = parseWRPCMessage(data);

			// Handle responses to our requests
			if (parsedMessage.kind === 'response') {
				this.handleResponse(parsedMessage);
				return;
			}

			const ctx = await this.options.onContext(parsedMessage);

			// Handle requests from server
			await this.handleServerRequest(parsedMessage, ctx);
		} catch (error) {
			console.error('Error parsing or validating WebSocket message:', error);
		}
	}

	private handleResponse(response: WRPCResponse): void {
		const pendingRequest = this.pendingRequests.get(response.id);
		if (!pendingRequest) {
			console.warn('Received response for unknown request:', response.id);
			return;
		}

		this.pendingRequests.delete(response.id);

		if (response.result.type === 'error') {
			const error = new Error(response.result.error.message);
			(error as Error & { code?: string }).code = response.result.error.code;
			pendingRequest.reject(error);
		} else if (response.result.type === 'data') {
			pendingRequest.resolve(response.result.data);
		}
	}

	private async handleServerRequest(request: WRPCRequest, ctx: InferRouterContext<TClientRouter>): Promise<void> {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			console.error('WebSocket not connected when handling server request');
			return;
		}

		try {
			// Find the procedure in our client router
			const procedure = this.getProcedureAtPath(this.clientRouter, request.path);

			if (!procedure) {
				throw new Error(`No procedure found at path: ${request.path}`);
			}

			const session = createClientSideSession(
				this,
				this.options.roomId,
				this.options.clientId,
				this.options.deviceId,
				this.options.deviceName || 'unknown'
			);

			// Call the procedure (it will handle input validation internally)
			const result = await this.callProcedure(procedure, request.input, session, ctx);

			// Send response back to server
			const response: WRPCResponse = {
				kind: 'response',
				id: request.id,
				result: {
					type: 'data',
					data: result
				}
			};

			ws.send(JSON.stringify(response));
		} catch (error) {
			// Send error response
			const response: WRPCResponse = {
				kind: 'response',
				id: request.id,
				result: {
					type: 'error',
					error: {
						message: error instanceof Error ? error.message : 'Unknown error',
						code: 'CLIENT_ERROR'
					}
				}
			};

			ws.send(JSON.stringify(response));
		}
	}

	private getProcedureAtPath(router: AnyRouter, path: string): AnyProcedure | null {
		const parts = path.split('.');
		let current: unknown = router;

		for (const part of parts) {
			if (!current || typeof current !== 'object') {
				return null;
			}
			current = (current as Record<string, unknown>)[part];
		}

		// Check if it's a valid procedure
		if (typeof current === 'function') {
			const fn = current as unknown as AnyProcedure;
			if (typeof fn._def === 'object' && fn._def && fn._def.procedure === true) {
				return fn;
			}
		}

		return null;
	}

	private async callProcedure(procedure: AnyProcedure, input: unknown, session: Session<AnyRouter>, ctx: object): Promise<unknown> {
		const procedureFn = procedure as unknown as ProcedureResolver<unknown, unknown, unknown, object, AnyRouter>;
		return procedureFn({ input, session, ctx });
	}

	private async handleClose(event: CloseEvent): Promise<void> {
		this.ws = null;

		// Reject all pending requests
		for (const [id, request] of this.pendingRequests) {
			request.reject(new Error('WebSocket connection closed'));
		}
		this.pendingRequests.clear();

		if (event.code === ConnectionCloseCode.NORMAL) {
			this.connectionState = 'offline';
		} else if (event.code === ConnectionCloseCode.KICKED) {
			this.connectionState = 'offline';
		} else if (event.code === ConnectionCloseCode.SESSION_DESTROYED) {
			this.connectionState = 'offline';
		} else if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.connectionState = 'reconnecting';
			setTimeout(
				() => {
					this.reconnectAttempts++;
					this.connect().catch(console.error);
				},
				this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
			);
		}
		this.options.onClosed(event.code, event.reason);
	}

	private async sendRequest(request: WRPCRequest): Promise<unknown> {
		const ws = await this.connect();

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(request.id, {
				resolve,
				reject
			});
			ws.send(JSON.stringify(request));

			// Set timeout for request
			setTimeout(() => {
				if (this.pendingRequests.has(request.id)) {
					this.pendingRequests.delete(request.id);
					reject(new Error('Request timeout'));
				}
			}, 30000); // 30 seconds timeout
		});
	}

	/**
	 * Call a query procedure on the server
	 */
	query(path: string, input: unknown): Promise<unknown> {
		const request: WRPCRequest = {
			kind: 'request',
			id: this.generateRequestId(),
			type: 'query',
			path,
			input
		};
		return this.sendRequest(request);
	}

	/**
	 * Call a mutation procedure on the server
	 */
	mutation(path: string, input: unknown): Promise<unknown> {
		const request: WRPCRequest = {
			kind: 'request',
			id: this.generateRequestId(),
			type: 'mutation',
			path,
			input
		};
		return this.sendRequest(request);
	}

	/**
	 * Disconnect the WebSocket
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close(ConnectionCloseCode.NORMAL, 'Client disconnected peacefully');
			this.ws = null;
		}
		this.connectionState = 'offline';
	}

	/**
	 * Check if the WebSocket is connected
	 */
	isConnected(): this is { ws: WebSocket } {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	/**
	 * Get the current connection state
	 */
	getConnectionState(): ConnectionState {
		return this.connectionState;
	}
}
