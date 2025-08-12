/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWebSocketHandler } from './websocket-handler';
import type { WebSocketHandlerOptions } from './websocket-handler';
import type { AnyRouter } from './router';
import type { WRPCRequest, WRPCResponse } from './messages';
import { z } from 'zod';
import { initWRPC } from './initWRPC';

// Mock WebSocket
class MockWebSocket {
	readyState = 1; // OPEN
	send = vi.fn();
	close = vi.fn();
}

describe('WebSocket Handler', () => {
	let mockOptions: WebSocketHandlerOptions<AnyRouter>;
	let mockWebSockets: Map<string, MockWebSocket>;
	let testRouter: AnyRouter;
	let wsHandler: ReturnType<typeof createWebSocketHandler>;

	beforeEach(async () => {
		mockWebSockets = new Map();

		// Create a test router
		const w = initWRPC.createServer();
		testRouter = w.router({
			hello: w.procedure
				.input(z.string())
				.query(async ({ input }) => `Hello, ${input}!`),
			
			updateUser: w.procedure
				.input(z.object({ id: z.string(), name: z.string() }))
				.mutation(async ({ input }) => ({ success: true, user: input })),

			throwError: w.procedure
				.query(async () => {
					throw new Error('Test error');
				})
		});

		mockOptions = {
			router: testRouter,
			loadData: vi.fn().mockResolvedValue({ clients: [] }),
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

		wsHandler = createWebSocketHandler(mockOptions);
		await wsHandler.initialize();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initialization', () => {
		it('should initialize successfully', async () => {
			expect(wsHandler.connectionManager).toBeDefined();
		});

		it('should initialize connection manager', async () => {
			expect(mockOptions.loadData).toHaveBeenCalled();
		});
	});

	describe('handleConnection', () => {
		it('should handle new connection with connection options', async () => {
			const mockWs = new MockWebSocket();
			const connectionOpts = {
				sessionId: 'test-session',
				clientId: 'test-client',
				deviceName: 'Test Device'
			};

			await wsHandler.handleConnection(mockWs as any, connectionOpts);

			expect(mockOptions.saveData).toHaveBeenCalled();
		});

		it('should warn for connection without clientId or sessionId', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const mockWs = new MockWebSocket();

			await wsHandler.handleConnection(mockWs as any, {});

			expect(consoleSpy).toHaveBeenCalledWith(
				'WebSocket connection missing clientId or sessionId',
				{}
			);

			consoleSpy.mockRestore();
		});
	});

	describe('handleMessage', () => {
		let mockWs: MockWebSocket;

		beforeEach(async () => {
			mockWs = new MockWebSocket();
			mockWebSockets.set('test-client', mockWs);

			await wsHandler.handleConnection(mockWs as any, {
				sessionId: 'test-session',
				clientId: 'test-client',
				deviceName: 'Test Device'
			});
		});

		it('should handle valid query request', async () => {
			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request-1',
				type: 'query',
				path: 'hello',
				input: 'World'
			};

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'test-request-1',
					result: {
						type: 'data',
						data: 'Hello, World!'
					}
				})
			);
		});

		it('should handle valid mutation request', async () => {
			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request-2',
				type: 'mutation',
				path: 'updateUser',
				input: { id: '123', name: 'John Doe' }
			};

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'test-request-2',
					result: {
						type: 'data',
						data: { success: true, user: { id: '123', name: 'John Doe' } }
					}
				})
			);
		});

		it('should handle procedure that throws error', async () => {
			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request-error',
				type: 'query',
				path: 'throwError',
				input: null
			};

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'test-request-error',
					result: {
						type: 'error',
						error: {
							message: 'Internal server error',
							code: 'INTERNAL_ERROR'
						}
					}
				})
			);

			expect(mockOptions.onError).toHaveBeenCalled();
		});

		it('should handle request for non-existent procedure', async () => {
			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request-404',
				type: 'query',
				path: 'nonExistentProcedure',
				input: null
			};

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'test-request-404',
					result: {
						type: 'error',
						error: {
							message: 'No procedure found at path: nonExistentProcedure',
							code: undefined
						}
					}
				})
			);
		});

		it('should handle procedure type mismatch', async () => {
			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request-mismatch',
				type: 'mutation',
				path: 'hello', // hello is a query, not mutation
				input: 'World'
			};

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'test-request-mismatch',
					result: {
						type: 'error',
						error: {
							message: 'Procedure type mismatch. Expected query, got mutation',
							code: undefined
						}
					}
				})
			);
		});

		it('should handle malformed JSON message', async () => {
			await wsHandler.handleMessage(mockWs as any, 'invalid json');

			// Verify that an error response was sent
			expect(mockWs.send).toHaveBeenCalledTimes(1);
			const sentMessage = mockWs.send.mock.calls[0][0];
			const response = JSON.parse(sentMessage);
			
			expect(response).toEqual({
				kind: 'response',
				id: 'unknown',
				result: {
					type: 'error',
					error: {
						message: expect.any(String),
						code: 'PARSE_ERROR'
					}
				}
			});

			expect(mockOptions.onError).toHaveBeenCalled();
		});

		it('should handle response messages (from client)', async () => {
			const response: WRPCResponse = {
				kind: 'response',
				id: 'test-response',
				result: { type: 'data', data: 'client response' }
			};

			// Mock the connection manager's handleResponse method
			const handleResponseSpy = vi.spyOn(wsHandler.connectionManager, 'handleResponse');

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(response));

			expect(handleResponseSpy).toHaveBeenCalledWith(response, 'test-client');
		});

		it('should handle response without client identification', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			// Mock getClientIdByWebSocket to return null
			vi.mocked(mockOptions.getClientIdByWebSocket).mockReturnValue(null);

			const response: WRPCResponse = {
				kind: 'response',
				id: 'test-response',
				result: { type: 'data', data: 'client response' }
			};

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(response));

			expect(consoleSpy).toHaveBeenCalledWith('Received response but could not identify client');
			
			consoleSpy.mockRestore();
		});

		it('should handle message without connection options', async () => {
			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request-no-opts',
				type: 'query',
				path: 'hello',
				input: 'World'
			};

			// Don't provide connection options, rely on getClientIdByWebSocket
			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'test-request-no-opts',
					result: {
						type: 'data',
						data: 'Hello, World!'
					}
				})
			);
		});
	});

	describe('handleClose', () => {
		it('should handle connection close', async () => {
			const mockWs = new MockWebSocket();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await wsHandler.handleClose(mockWs as any, 1000, 'Normal closure', {
				clientId: 'test-client'
			});

			expect(consoleSpy).toHaveBeenCalledWith('WebSocket closed with code 1000: Normal closure');
			expect(mockOptions.saveData).toHaveBeenCalled(); // From removeConnection
			
			consoleSpy.mockRestore();
		});

		it('should handle close without client ID', async () => {
			const mockWs = new MockWebSocket();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await wsHandler.handleClose(mockWs as any, 1000, 'Normal closure');

			expect(consoleSpy).toHaveBeenCalledWith('WebSocket closed with code 1000: Normal closure');
			
			consoleSpy.mockRestore();
		});
	});

	describe('handleError', () => {
		it('should handle WebSocket error', () => {
			const mockWs = new MockWebSocket();
			const error = new Error('WebSocket error');
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			wsHandler.handleError(mockWs as any, error, { clientId: 'test-client' });

			expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', error);
			
			consoleSpy.mockRestore();
		});
	});

	describe('integration with connection manager', () => {
		it('should use connection manager for client data', async () => {
			const mockWs = new MockWebSocket();
			mockWebSockets.set('test-client', mockWs);

			// Add connection first
			await wsHandler.handleConnection(mockWs as any, {
				sessionId: 'test-session',
				clientId: 'test-client',
				deviceName: 'Test Device'
			});

			const request: WRPCRequest = {
				kind: 'request',
				id: 'test-request',
				type: 'query',
				path: 'hello',
				input: 'World'
			};

			// Mock getClientData to verify it's called
			const getClientDataSpy = vi.spyOn(wsHandler.connectionManager, 'getClientData');

			await wsHandler.handleMessage(mockWs as any, JSON.stringify(request));

			expect(getClientDataSpy).toHaveBeenCalledWith('test-client');
		});
	});
});