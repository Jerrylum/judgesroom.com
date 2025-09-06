/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketConnectionManager } from './connection-manager';
import type { WebSocketHandlerOptions } from './websocket-handler';
import type { AnyRouter } from './router';
import type { WRPCRequest, WRPCResponse } from './messages';

// Mock WebSocket
class MockWebSocket {
	readyState = 1; // OPEN
	send = vi.fn();
	close = vi.fn();
}

describe('WebSocketConnectionManager', () => {
	let connectionManager: WebSocketConnectionManager;
	let mockOptions: WebSocketHandlerOptions<AnyRouter>;
	let mockWebSockets: Map<string, MockWebSocket>;

	beforeEach(async () => {
		mockWebSockets = new Map();

		mockOptions = {
			router: {} as AnyRouter,
			loadData: vi.fn().mockResolvedValue({ sessionId: null, clients: [] }),
			saveData: vi.fn().mockResolvedValue(undefined),
			destroy: vi.fn().mockResolvedValue(undefined),
			getWebSocket: vi.fn().mockImplementation((clientId: string) => {
				return mockWebSockets.get(clientId) || null;
			}),
			getClientIdByWebSocket: vi.fn().mockImplementation((ws: WebSocket) => {
				for (const [clientId, mockWs] of mockWebSockets.entries()) {
					if (mockWs === (ws as any)) return clientId;
				}
				return null;
			}),
			onError: vi.fn()
		};

		connectionManager = new WebSocketConnectionManager(mockOptions);
		await connectionManager.initialize();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initialization', () => {
		it('should initialize with empty client list', async () => {
			const clients = connectionManager.getAllClientData();
			expect(clients).toEqual([]);
		});

		it('should load existing data on initialization', async () => {
			const existingData = {
				sessionId: null,
				clients: [
					{
						clientId: 'client1',
						deviceName: 'Device1',
						connectedAt: Date.now()
					}
				]
			};

			vi.mocked(mockOptions.loadData).mockResolvedValue(existingData);

			const newManager = new WebSocketConnectionManager(mockOptions);
			await newManager.initialize();

			const clients = newManager.getAllClientData();
			expect(clients).toEqual(existingData.clients);
		});
	});

	describe('connection management', () => {
		it('should add a new connection', async () => {
			const mockWs = new MockWebSocket();
			mockWebSockets.set('client1', mockWs);

			await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'client1', 'Test Device');

			const clientData = connectionManager.getClientData('client1');
			expect(clientData).toEqual({
				clientId: 'client1',
				deviceName: 'Test Device',
				connectedAt: expect.any(Number)
			});

			expect(mockOptions.saveData).toHaveBeenCalled();
		});

		describe('session id handling', () => {
			it('should throw on session id mismatch', async () => {
				const mockWs = new MockWebSocket();
				mockWebSockets.set('client1', mockWs);

				await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'client1', 'Device1');

				await expect(connectionManager.addConnection(mockWs as unknown as WebSocket, 'session2', 'client2', 'Device2')).rejects.toThrow(
					'Session ID mismatch'
				);
			});

			it('getSessionId should throw before first connection and return after', async () => {
				const newManager = new WebSocketConnectionManager(mockOptions);
				await newManager.initialize();

				expect(() => newManager.getSessionId()).toThrow('Session ID not set');

				const mockWs = new MockWebSocket();
				mockWebSockets.set('clientA', mockWs);
				await newManager.addConnection(mockWs as unknown as WebSocket, 'abc-session', 'clientA', 'A');

				expect(newManager.getSessionId()).toBe('abc-session');
			});
		});

		describe('kickClient', () => {
			it('should close socket and remove client', async () => {
				const mockWs = new MockWebSocket();
				mockWebSockets.set('clientZ', mockWs);
				await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'clientZ', 'Z');

				await connectionManager.kickClient('clientZ');

				expect(mockWs.close).toHaveBeenCalled();
				expect(connectionManager.getClientData('clientZ')).toBeNull();
			});
		});

		it('should remove existing client when reconnecting', async () => {
			const mockWs1 = new MockWebSocket();
			const mockWs2 = new MockWebSocket();
			mockWebSockets.set('client1', mockWs1);

			// Add initial connection
			await connectionManager.addConnection(mockWs1 as unknown as WebSocket, 'session1', 'client1', 'Device1');

			// Add reconnection with same client ID
			mockWebSockets.set('client1', mockWs2);
			await connectionManager.addConnection(mockWs2 as unknown as WebSocket, 'session1', 'client1', 'Device1 Updated');

			const allClients = connectionManager.getAllClientData();
			expect(allClients).toHaveLength(1);
			expect(allClients[0].deviceName).toBe('Device1 Updated');
		});

		it('should remove a connection', async () => {
			const mockWs = new MockWebSocket();
			mockWebSockets.set('client1', mockWs);

			await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'client1', 'Test Device');

			await connectionManager.removeConnection('client1');

			const clientData = connectionManager.getClientData('client1');
			expect(clientData).toBeNull();

			expect(mockOptions.saveData).toHaveBeenCalledTimes(2); // Once for add, once for remove
		});

		it('should handle removing non-existent connection gracefully', async () => {
			await expect(connectionManager.removeConnection('non-existent')).resolves.not.toThrow();
		});
	});

	describe('client data management', () => {
		beforeEach(async () => {
			const mockWs = new MockWebSocket();
			mockWebSockets.set('client1', mockWs);

			await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'client1', 'Test Device');
		});

		it('should get client data by ID', () => {
			const clientData = connectionManager.getClientData('client1');
			expect(clientData).toEqual({
				clientId: 'client1',
				deviceName: 'Test Device',
				connectedAt: expect.any(Number)
			});
		});

		it('should return null for non-existent client', () => {
			const clientData = connectionManager.getClientData('non-existent');
			expect(clientData).toBeNull();
		});

		it('should get all client data', () => {
			const allClients = connectionManager.getAllClientData();
			expect(allClients).toHaveLength(1);
			expect(allClients[0].clientId).toBe('client1');
		});

		it('should check if client is connected', () => {
			expect(connectionManager.isClientConnected('client1')).toBe(true);
			expect(connectionManager.isClientConnected('non-existent')).toBe(false);
		});

		it('should get connected clients list', () => {
			const connectedClients = connectionManager.getConnectedClients();
			expect(connectedClients).toEqual(['client1']);
		});

		it('should filter out clients without active WebSocket connections', async () => {
			// Add another client but don't add WebSocket
			const mockWs2 = new MockWebSocket();
			await connectionManager.addConnection(mockWs2 as unknown as WebSocket, 'session1', 'client2', 'Device2');

			// Remove WebSocket for client2 (simulating disconnection)
			mockWebSockets.delete('client2');

			const connectedClients = connectionManager.getConnectedClients();
			expect(connectedClients).toEqual(['client1']);
		});
	});

	describe('sendToClient', () => {
		let mockWs: MockWebSocket;
		let testRequest: WRPCRequest;

		beforeEach(async () => {
			mockWs = new MockWebSocket();
			mockWebSockets.set('client1', mockWs);

			await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'client1', 'Test Device');

			testRequest = {
				kind: 'request',
				id: 'test-request-id',
				type: 'query',
				path: 'test.procedure',
				input: 'test input'
			};
		});

		it('should send request to specific client', async () => {
			const responsePromise = connectionManager.sendToClient('client1', testRequest);

			// Simulate client response
			const response: WRPCResponse = {
				kind: 'response',
				id: 'test-request-id',
				result: { type: 'data', data: 'test result' }
			};

			connectionManager.handleResponse(response, 'client1');

			const result = await responsePromise;
			expect(result).toBe(response);
			expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(testRequest));
		});

		it('should throw error for non-existent client', async () => {
			await expect(connectionManager.sendToClient('non-existent', testRequest)).rejects.toThrow('Client non-existent is not connected');
		});

		it('should throw error if WebSocket not found', async () => {
			// Remove WebSocket but keep client data
			mockWebSockets.delete('client1');

			await expect(connectionManager.sendToClient('client1', testRequest)).rejects.toThrow('Client client1 WebSocket not found');
		});

		it('should handle timeout', async () => {
			vi.useFakeTimers();

			const responsePromise = connectionManager.sendToClient('client1', testRequest);

			// Fast-forward time to trigger timeout
			vi.advanceTimersByTime(31000);

			await expect(responsePromise).rejects.toThrow('Request test-request-id to client client1 timed out');

			vi.useRealTimers();
		});

		it('should handle error responses', async () => {
			const responsePromise = connectionManager.sendToClient('client1', testRequest);

			// Simulate error response
			const errorResponse: WRPCResponse = {
				kind: 'response',
				id: 'test-request-id',
				result: {
					type: 'error',
					error: {
						message: 'Test error',
						code: 'TEST_ERROR'
					}
				}
			};

			connectionManager.handleResponse(errorResponse, 'client1');

			await expect(responsePromise).rejects.toThrow('Test error');
		});
	});

	describe('broadcast', () => {
		let testRequest: WRPCRequest;

		beforeEach(async () => {
			// Add multiple clients
			for (let i = 1; i <= 3; i++) {
				const mockWs = new MockWebSocket();
				mockWebSockets.set(`client${i}`, mockWs);

				await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', `client${i}`, `Device${i}`);
			}

			testRequest = {
				kind: 'request',
				id: 'broadcast-request',
				type: 'mutation',
				path: 'notify.all',
				input: 'broadcast message'
			};
		});

		it('should broadcast to all connected clients', async () => {
			const broadcastPromise = connectionManager.broadcast(testRequest);

			// Simulate responses from all clients
			for (let i = 1; i <= 3; i++) {
				const response: WRPCResponse = {
					kind: 'response',
					id: `broadcast-request-client${i}`,
					result: { type: 'data', data: `response from client ${i}` }
				};
				connectionManager.handleResponse(response, `client${i}`);
			}

			const results = await broadcastPromise;
			expect(results).toHaveLength(3);

			// Check that each client received a unique request ID
			for (let i = 1; i <= 3; i++) {
				const mockWs = mockWebSockets.get(`client${i}`);
				expect(mockWs!.send).toHaveBeenCalledWith(
					JSON.stringify({
						...testRequest,
						id: `broadcast-request-client${i}`
					})
				);
			}
		});

		it('should return empty array when no clients connected', async () => {
			// Remove all clients
			await connectionManager.removeConnection('client1');
			await connectionManager.removeConnection('client2');
			await connectionManager.removeConnection('client3');

			const results = await connectionManager.broadcast(testRequest);
			expect(results).toEqual([]);
		});

		it('should handle partial failures in broadcast', async () => {
			// Remove WebSocket for client2 to simulate failure
			mockWebSockets.delete('client2');

			const broadcastPromise = connectionManager.broadcast(testRequest);

			// Respond for successful clients
			for (const clientId of ['client1', 'client3']) {
				const response: WRPCResponse = {
					kind: 'response',
					id: `broadcast-request-${clientId}`,
					result: { type: 'data', data: `response from ${clientId}` }
				};
				connectionManager.handleResponse(response, clientId);
			}

			const results = await broadcastPromise;
			expect(results).toHaveLength(2);

			// Only client1 and client3 should have responses since client2 was disconnected
			const client1Response = results.find((r) => r.id === 'broadcast-request-client1');
			const client3Response = results.find((r) => r.id === 'broadcast-request-client3');
			expect(client1Response?.result.type).toBe('data');
			expect(client3Response?.result.type).toBe('data');
		});
	});

	describe('handleResponse', () => {
		it('should handle response for unknown request gracefully', () => {
			const response: WRPCResponse = {
				kind: 'response',
				id: 'unknown-request',
				result: { type: 'data', data: 'test' }
			};

			expect(() => {
				connectionManager.handleResponse(response, 'client1');
			}).not.toThrow();
		});

		it('should clean up pending requests when client disconnects', async () => {
			const mockWs = new MockWebSocket();
			mockWebSockets.set('client1', mockWs);

			await connectionManager.addConnection(mockWs as unknown as WebSocket, 'session1', 'client1', 'Test Device');

			// Start a request
			const testRequest: WRPCRequest = {
				kind: 'request',
				id: 'test-request',
				type: 'query',
				path: 'test',
				input: null
			};

			const requestPromise = connectionManager.sendToClient('client1', testRequest);

			// Remove connection (simulating disconnect)
			await connectionManager.removeConnection('client1');

			// The request should be rejected
			await expect(requestPromise).rejects.toThrow('Client client1 disconnected');
		});
	});

	describe('destroy', () => {
		it('should destroy all data', async () => {
			await connectionManager.destroy();

			expect(mockOptions.destroy).toHaveBeenCalled();
			expect(connectionManager.getAllClientData()).toEqual([]);
		});
	});
});
