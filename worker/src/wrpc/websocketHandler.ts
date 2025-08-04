/**
 * WebSocket handler for WRPC, inspired by tRPC's fetchRequestHandler
 */
import type { AnyRouter } from './router';
import { WRPCRequest, WRPCResponse, WRPCError } from './types';
import { AnyProcedure } from './procedure';
import { WebSocketConnectionManager } from './connectionManager';
import { createSession, type Session } from './session';

export interface WebSocketHandlerOptions<TRouter extends AnyRouter, TClientRouter extends AnyRouter = AnyRouter> {
	/**
	 * The router instance
	 */
	router: TRouter;
	/**
	 * Durable Object state for hibernation support
	 */
	ctx: DurableObjectState;
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
async function callProcedure(procedure: AnyProcedure, input: unknown, session: Session): Promise<unknown> {
	// The procedure is a function that validates input and calls the resolver
	// Cast to function since we know it's callable from the procedure definition
	const procedureFn = procedure as unknown as (opts: { input: unknown; session: Session }) => Promise<unknown>;
	return await procedureFn({ input, session });
}

/**
 * Create a WebSocket message handler for a WRPC router
 */
export function createWebSocketHandler<TRouter extends AnyRouter, TClientRouter extends AnyRouter = AnyRouter>(
	opts: WebSocketHandlerOptions<TRouter, TClientRouter>
) {
	const connectionManager = new WebSocketConnectionManager(opts.ctx);

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
				const request: WRPCRequest = JSON.parse(message);

				// Find clientId if not provided in connectionOpts
				const clientId = connectionOpts?.clientId || connectionManager.getClientIdByWebSocket(ws);

				// Check if this is a response from client (for server-to-client calls)
				if (request.id && clientId) {
					// Check if this might be a response to a server-initiated request
					connectionManager.handleResponse(request as unknown as WRPCResponse, clientId);
					return;
				}

				// Validate request structure
				if (!request.id || !request.type || !request.path) {
					throw new WRPCError('Invalid request structure');
				}

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
					const session = createSession<TClientRouter>(
						connectionManager,
						clientData?.sessionId || connectionOpts?.sessionId || 'unknown',
						clientId || 'unknown',
						clientData?.deviceName || connectionOpts?.deviceName
					);

					// Handle query and mutation only
					const result = await callProcedure(procedure, request.input, session);

					const response: WRPCResponse = {
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
				// Handle JSON parsing errors or malformed requests
				const error = new WRPCError('Invalid JSON or malformed request', 'PARSE_ERROR', parseError);

				// Send error response with unknown id
				const errorResponse: WRPCResponse = {
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
					req: { id: 'unknown', type: 'query', path: 'unknown', input: null } as WRPCRequest,
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
