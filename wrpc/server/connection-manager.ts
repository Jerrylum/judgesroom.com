import type { AnyRouter } from './router';
import type { WRPCRequest, WRPCResponse } from './messages';
import type { WebSocketHandlerOptions } from './websocket-handler';
import type { ClientData, Network } from './types';

/**
 * Server data stored in Durable Object storage
 */
interface ServerData {
	sessionId: string | null;
	// This is the list of clients that are "likely"connected to the server
	// However, it is not guaranteed that the client is actually connected to the server
	// because the client may have disconnected and the server may not have removed the client from the list
	// isClientConnected is used to check if the client is actually connected to the server
	clients: ClientData[];
}

/**
 * Implementation of ConnectionManager for Cloudflare WebSocket Hibernation Server
 */
export class WebSocketConnectionManager implements Network {
	private opts: WebSocketHandlerOptions<AnyRouter>;
	private serverData: ServerData = { sessionId: null, clients: [] };
	private isLoaded = false;
	private pendingRequests = new Map<
		string,
		{
			resolve: (response: WRPCResponse) => void;
			reject: (error: Error) => void;
			timeout: number;
		}
	>();

	constructor(opts: WebSocketHandlerOptions<AnyRouter>) {
		this.opts = opts;
	}

	/**
	 * Initialize the connection manager (must be called in constructor)
	 */
	async initialize() {
		await this.load();
	}

	getSessionId(): string {
		if (!this.isRunning()) {
			throw new Error('Connection manager not initialized');
		}

		if (this.serverData.sessionId === null) {
			throw new Error('Session ID not set');
		}

		return this.serverData.sessionId;
	}

	/**
	 * Add a WebSocket connection with hibernation support
	 */
	async addConnection(ws: WebSocket, sessionId: string, clientId: string, deviceName?: string) {
		if (!this.isRunning()) {
			throw new Error('Connection manager not initialized');
		}
		if (this.serverData.sessionId !== null && this.serverData.sessionId !== sessionId) {
			throw new Error('Session ID mismatch');
		}
		this.serverData.sessionId = sessionId;

		// Remove existing client data if reconnecting
		this.serverData.clients = this.serverData.clients.filter((c) => c.clientId !== clientId);

		// Add new client data
		this.serverData.clients.push({
			clientId,
			deviceName,
			connectedAt: Date.now()
		});

		await this.save();
	}

	/**
	 * Remove a WebSocket connection
	 */
	async removeConnection(clientId: string) {
		if (!this.isRunning()) {
			return; // Don't throw error during cleanup
		}

		this.serverData.clients = this.serverData.clients.filter((c) => c.clientId !== clientId);
		await this.save();

		// Reject any pending requests for this client
		for (const [requestId, pending] of this.pendingRequests) {
			if (requestId.startsWith(clientId + ':')) {
				clearTimeout(pending.timeout);
				pending.reject(new Error(`Client ${clientId} disconnected`));
				this.pendingRequests.delete(requestId);
			}
		}
	}

	/**
	 * Handle response from client
	 */
	handleResponse(response: WRPCResponse, clientId: string) {
		const requestKey = `${clientId}:${response.id}`;
		const pending = this.pendingRequests.get(requestKey);

		if (pending) {
			clearTimeout(pending.timeout);
			this.pendingRequests.delete(requestKey);

			if (response.result?.type === 'error') {
				const error = new Error(response.result.error?.message || 'Unknown error');
				pending.reject(error);
			} else {
				pending.resolve(response);
			}
		}
	}

	/**
	 * Send a request to a specific client
	 */
	async sendToClient(clientId: string, request: WRPCRequest): Promise<WRPCResponse> {
		// Check if client exists in storage
		const clientData = this.getClientData(clientId);
		if (!clientData) {
			throw new Error(`Client ${clientId} is not connected`);
		}

		// Get WebSocket using hibernation-compatible method
		const ws = this.opts.getWebSocket(clientId);
		if (!ws) {
			throw new Error(`Client ${clientId} WebSocket not found`);
		}

		return new Promise((resolve, reject) => {
			const requestKey = `${clientId}:${request.id}`;

			// Set up timeout
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(requestKey);
				reject(new Error(`Request ${request.id} to client ${clientId} timed out`));
			}, 30000); // 30 second timeout

			// Store pending request
			this.pendingRequests.set(requestKey, {
				resolve,
				reject,
				timeout: timeout as unknown as number
			});

			// Send request to client
			ws.send(JSON.stringify(request));
		});
	}

	/**
	 * Broadcast a request to all connected clients
	 */
	async broadcast(request: WRPCRequest): Promise<WRPCResponse[]> {
		const clientIds = this.getConnectedClients();

		if (clientIds.length === 0) {
			return [];
		}

		// Create separate requests for each client to avoid ID conflicts
		const promises = clientIds.map(async (clientId) => {
			const clientRequest: WRPCRequest = {
				...request,
				id: `${request.id}-${clientId}` // Make ID unique per client
			};

			try {
				return await this.sendToClient(clientId, clientRequest);
			} catch (error) {
				// Return error response for failed broadcasts
				return {
					kind: 'response' as const,
					id: clientRequest.id,
					result: {
						type: 'error' as const,
						error: {
							message: error instanceof Error ? error.message : 'Broadcast failed',
							code: 'BROADCAST_ERROR'
						}
					}
				};
			}
		});

		return Promise.all(promises);
	}

	/**
	 * Get all connected client IDs (hibernation-compatible)
	 */
	getConnectedClients(): Readonly<string[]> {
		if (!this.isRunning()) {
			return [];
		}
		// Filter clients that actually have active WebSocket connections
		return [
			...this.serverData.clients.filter((client) => this.opts.getWebSocket(client.clientId) !== null).map((client) => client.clientId)
		];
	}

	/**
	 * Check if a client is connected (hibernation-compatible)
	 */
	isClientConnected(clientId: string): boolean {
		return this.opts.getWebSocket(clientId) !== null;
	}

	/**
	 * Get all client data
	 */
	getAllClientData(): Readonly<Readonly<ClientData>[]> {
		if (!this.isRunning()) {
			return [];
		}
		return [...this.serverData.clients];
	}

	/**
	 * Get client data by clientId
	 */
	getClientData(clientId: string): Readonly<ClientData> | null {
		if (!this.isRunning()) {
			throw new Error('Connection manager not initialized');
		}
		return this.serverData.clients.find((c) => c.clientId === clientId) || null;
	}

	async kickClient(clientId: string) {
		if (!this.isRunning()) {
			return; // Don't throw error during cleanup
		}
		const ws = this.opts.getWebSocket(clientId);
		if (ws) {
			ws.close();
		}
		this.removeConnection(clientId);
	}

	/**
	 * Check if server is running
	 */
	private isRunning(): boolean {
		return this.isLoaded;
	}

	/**
	 * Load data from Durable Object storage
	 */
	private async load() {
		this.serverData = ((await this.opts.loadData()) || { clients: [] }) as ServerData;
		this.isLoaded = true;
	}

	/**
	 * Save data to Durable Object storage
	 */
	private async save() {
		if (!this.isRunning()) {
			throw new Error('Connection manager not initialized');
		}
		await this.opts.saveData(this.serverData);
	}

	/**
	 * Destroy all data (for cleanup)
	 */
	async destroy() {
		this.serverData = { sessionId: null, clients: [] };
		this.isLoaded = false;
		await this.opts.destroy();
	}
}
