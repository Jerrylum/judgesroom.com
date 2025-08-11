/**
 * WebSocket handler for WRPC, inspired by tRPC's fetchRequestHandler
 */
import type { AnyRouter } from './router';
import type { WRPCRequest, WRPCResponse } from './types';
import { WRPCError } from './types';
import type { AnyProcedure } from './procedure';
import { WebSocketConnectionManager } from './connection-manager';
import { createSession, type Session } from './session';
import { parseWRPCMessage } from './utils';
import type { ProcedureResolver } from './procedure-builder';

export interface WebSocketHandlerOptions<TRouter extends AnyRouter> {
	/**
	 * The router instance
	 */
	router: TRouter;

	/**
	 * Load data from Durable Object storage
	 */
	loadData: () => Promise<unknown>;

	/**
	 * Save data to Durable Object storage
	 */
	saveData: (data: unknown) => Promise<void>;

	/**
	 * Destroy all data (for cleanup)
	 */
	destroy: () => Promise<void>;

	/**
	 * Get WebSocket by clientId
	 */
	getWebSocket: (clientId: string) => WebSocket | null;

	/**
	 * Get clientId by WebSocket
	 */
	getClientIdByWebSocket: (ws: WebSocket) => string | null;

	/**
	 * Called when an error occurs
	 */
	onError?: (opts: { error: WRPCError; req: WRPCRequest; ws: WebSocket }) => void;
}

export interface WebSocketConnectionOptions {
	sessionId?: string;
	clientId?: string;
	deviceName?: string;
}

/**
 * Get a procedure from the router by path
 */
function getProcedureAtPath(router: AnyRouter, path: string): AnyProcedure | null {
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

/**
 * Call a procedure with the given input and session
 */
async function callProcedure(procedure: AnyProcedure, input: unknown, session: Session<AnyRouter>): Promise<unknown> {
	// The procedure is a function that validates input and calls the resolver
	// Cast to function since we know it's callable from the procedure definition
	const procedureFn = procedure as unknown as ProcedureResolver<unknown, never, AnyRouter>;
	return await procedureFn({ input, session });
}

/**
 * Create a WebSocket message handler for a WRPC router
 */
export function createWebSocketHandler<TRouter extends AnyRouter>(
	opts: WebSocketHandlerOptions<TRouter>
) {
	const connectionManager = new WebSocketConnectionManager(opts);

	return {
		/**
		 * Get the connection manager instance
		 */
		connectionManager,

		/**
		 * Initialize the handler (must be called in Durable Object constructor)
		 */
		async initialize() {
			await connectionManager.initialize();
		},

		/**
		 * Handle incoming WebSocket messages
		 */
		async handleMessage(ws: WebSocket, message: string, connectionOpts?: WebSocketConnectionOptions): Promise<void> {
			try {
				// Parse and validate the message using Zod
				const parsedMessage = parseWRPCMessage(message);

				// Find clientId if not provided in connectionOpts
				const clientId = connectionOpts?.clientId || opts.getClientIdByWebSocket(ws);

				// Handle responses from client (for server-to-client calls)
				if (parsedMessage.kind === 'response') {
					if (clientId) {
						connectionManager.handleResponse(parsedMessage, clientId);
					} else {
						console.warn('Received response but could not identify client');
					}
					return;
				}

				// Handle requests from client
				const request = parsedMessage;

				try {
					const procedure = getProcedureAtPath(opts.router, request.path);

					if (!procedure) {
						throw new WRPCError(`No procedure found at path: ${request.path}`);
					}

					// Check if procedure type matches request type
					if (procedure._def.type !== request.type) {
						throw new WRPCError(`Procedure type mismatch. Expected ${procedure._def.type}, got ${request.type}`);
					}

					// Get client data for session creation
					const clientData = clientId ? connectionManager.getClientData(clientId) : null;

					// Create session for this request
					const session = createSession<TRouter>(
						connectionManager,
						clientData?.sessionId || connectionOpts?.sessionId || 'unknown',
						clientId || 'unknown',
						clientData?.deviceName || connectionOpts?.deviceName || 'unknown'
					);

					// Handle query and mutation only
					const result = await callProcedure(procedure, request.input, session);

					const response: WRPCResponse = {
						kind: 'response',
						id: request.id,
						result: {
							type: 'data',
							data: result
						}
					};

					ws.send(JSON.stringify(response));
				} catch (procedureError) {
					const error =
						procedureError instanceof WRPCError ? procedureError : new WRPCError('Internal server error', 'INTERNAL_ERROR', procedureError);

					const errorResponse: WRPCResponse = {
						kind: 'response',
						id: request.id,
						result: {
							type: 'error',
							error: {
								message: error.message,
								code: error.code
							}
						}
					};

					ws.send(JSON.stringify(errorResponse));

					// Call error handler if provided
					opts.onError?.({
						error,
						req: request,
						ws
					});
				}
			} catch (parseError) {
				// Handle JSON parsing errors, validation errors, or malformed requests
				const error = new WRPCError(parseError instanceof Error ? parseError.message : 'Invalid message format', 'PARSE_ERROR', parseError);

				// Send error response with unknown id
				const errorResponse: WRPCResponse = {
					kind: 'response',
					id: 'unknown',
					result: {
						type: 'error',
						error: {
							message: error.message,
							code: error.code
						}
					}
				};

				ws.send(JSON.stringify(errorResponse));

				opts.onError?.({
					error,
					req: { kind: 'request', id: 'unknown', type: 'query', path: 'unknown', input: null } as WRPCRequest,
					ws
				});
			}
		},

		/**
		 * Handle WebSocket connection setup
		 * Note: Event listeners won't work with Cloudflare WebSocket Hibernation Server
		 * Instead, call handleMessage, handleClose, and handleError directly from the server
		 */
		async handleConnection(ws: WebSocket, connectionOpts?: WebSocketConnectionOptions) {
			if (connectionOpts?.clientId && connectionOpts?.sessionId) {
				// Add connection to manager (async with storage)
				await connectionManager.addConnection(ws, connectionOpts.sessionId, connectionOpts.clientId, connectionOpts.deviceName);
				console.log('WebSocket connection established', connectionOpts);
			} else {
				console.warn('WebSocket connection missing clientId or sessionId', connectionOpts);
			}
		},

		/**
		 * Handle WebSocket close event
		 * This should be called from webSocketClose() in the Durable Object
		 */
		async handleClose(ws: WebSocket, code: number, reason: string, connectionOpts?: WebSocketConnectionOptions) {
			if (connectionOpts?.clientId) {
				await connectionManager.removeConnection(connectionOpts.clientId);
			}
			console.log(`WebSocket closed with code ${code}: ${reason}`);
		},

		/**
		 * Handle WebSocket error event
		 * This should be called from webSocketError() in the Durable Object
		 */
		handleError(ws: WebSocket, error: Error, connectionOpts?: WebSocketConnectionOptions) {
			console.error('WebSocket error:', error);
		}
	};
}
