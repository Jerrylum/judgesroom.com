/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebsocketClient } from './websocket-client';
import type { ClientOptions } from './types';
import type { AnyRouter } from '../server/router';
import type { WRPCRequest, WRPCResponse } from '../server/messages';
import { initWRPC } from '../server/initWRPC';
import { z } from 'zod';

// Mock WebSocket
const MockWebSocket = vi.fn().mockImplementation((url: string) => {
	const mockWs = {
		readyState: 0, // CONNECTING initially
		url,
		send: vi.fn(),
		close: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),

		// Event handlers
		onopen: null as any,
		onmessage: null as any,
		onclose: null as any,
		onerror: null as any,

		// Simulate message
		simulateMessage: (data: string) => {
			if (mockWs.onmessage) {
				mockWs.onmessage({ data } as MessageEvent);
			}
		},

		// Simulate close
		simulateClose: (code = 1000, reason = '') => {
			mockWs.readyState = 3; // CLOSED
			if (mockWs.onclose) {
				mockWs.onclose({ code, reason } as CloseEvent);
			}
		},

		// Simulate error
		simulateError: () => {
			if (mockWs.onerror) {
				mockWs.onerror(new Event('error'));
			}
		}
	};

	// Simulate connection opening
	setTimeout(() => {
		mockWs.readyState = 1; // OPEN
		if (mockWs.onopen) {
			mockWs.onopen(new Event('open'));
		}
	}, 0);

	return mockWs;
});

// Add WebSocket constants to the mock
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('WebsocketClient', () => {
	let clientOptions: ClientOptions;
	let clientRouter: AnyRouter;
	let wsClient: WebsocketClient<AnyRouter>;

	beforeEach(() => {
		clientOptions = {
			wsUrl: 'ws://localhost:8080/ws',
			sessionId: 'test-session',
			clientId: 'test-client',
			deviceName: 'Test Device'
		};

		// Create a test client router
		const w = initWRPC.createClient();
		clientRouter = w.router({
			onNotification: w.procedure.input(z.string()).mutation(async ({ input }) => {
				console.log('Notification received:', input);
				return { received: true };
			}),

			getClientInfo: w.procedure.query(async () => ({
				clientId: 'test-client',
				status: 'online'
			})),

			throwError: w.procedure.mutation(async () => {
				throw new Error('Client error');
			})
		});

		wsClient = new WebsocketClient(clientOptions, clientRouter);
	});

	afterEach(() => {
		wsClient.disconnect();
		vi.clearAllMocks();
		MockWebSocket.mockClear();
	});

	describe('connection', () => {
		it('should create WebSocket connection with correct URL and parameters', async () => {
			const queryPromise = wsClient.query('test', 'input');

			// Wait for connection to establish
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that WebSocket was created with correct URL
			expect(MockWebSocket).toHaveBeenCalledWith(
				'ws://localhost:8080/ws?sessionId=test-session&clientId=test-client&deviceName=Test+Device&action=join'
			);

			// Clean up the pending request
			wsClient.disconnect();
		});

		it('should handle connection without optional parameters', async () => {
			const minimalOptions: ClientOptions = {
				wsUrl: 'ws://localhost:8080/ws'
			};

			const minimalClient = new WebsocketClient(minimalOptions, clientRouter);
			const queryPromise = minimalClient.query('test', 'input');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:8080/ws?action=join');

			minimalClient.disconnect();
		});

		it.skip('should handle connection failure', async () => {
			// Mock WebSocket constructor to simulate immediate error
			const OriginalWebSocket = global.WebSocket;
			global.WebSocket = class extends EventTarget {
				constructor(url: string) {
					super();
					setTimeout(() => this.dispatchEvent(new Event('error')), 0);
				}
			} as any;

			await expect(wsClient.query('test', 'input')).rejects.toThrow('WebSocket connection failed');

			global.WebSocket = OriginalWebSocket;
		});

		it('should reuse existing open connection', async () => {
			// First request - this will trigger connection creation
			const promise1 = wsClient.query('test1', 'input1');

			// Wait for connection to be established
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Verify first connection was created
			expect(MockWebSocket).toHaveBeenCalledTimes(1);

			// Second request should reuse the existing connection
			const promise2 = wsClient.query('test2', 'input2');

			// Wait a bit more to ensure no new connection is created
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Only one WebSocket should be created (connection reused)
			expect(MockWebSocket).toHaveBeenCalledTimes(1);
		});
	});

	describe('query', () => {
		it('should send query request and handle response', async () => {
			const queryPromise = wsClient.query('getUserData', { userId: '123' });

			// Wait for connection
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance
			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Verify request was sent
			expect(mockWs.send).toHaveBeenCalledTimes(1);

			// Parse and verify the sent request
			const requestCall = mockWs.send.mock.calls[0][0];
			const request = JSON.parse(requestCall);

			expect(request).toEqual({
				kind: 'request',
				id: expect.any(String),
				type: 'query',
				path: 'getUserData',
				input: { userId: '123' }
			});

			// Verify the request ID format (from websocket-client.ts line 29)
			expect(request.id).toMatch(/^req_\d+_\d+$/);

			// Simulate server response
			const response: WRPCResponse = {
				kind: 'response',
				id: request.id,
				result: {
					type: 'data',
					data: { userId: '123', name: 'John Doe' }
				}
			};

			mockWs.simulateMessage(JSON.stringify(response));

			const result = await queryPromise;
			expect(result).toEqual({ userId: '123', name: 'John Doe' });
		});

		it('should handle query with error response', async () => {
			const queryPromise = wsClient.query('failingQuery', null);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;
			const requestCall = mockWs.send.mock.calls[0][0];
			const request = JSON.parse(requestCall);

			const errorResponse: WRPCResponse = {
				kind: 'response',
				id: request.id,
				result: {
					type: 'error',
					error: {
						message: 'Query failed',
						code: 'QUERY_ERROR'
					}
				}
			};

			mockWs.simulateMessage(JSON.stringify(errorResponse));

			await expect(queryPromise).rejects.toThrow('Query failed');
		});

		it.skip('should handle request timeout', async () => {
			vi.useFakeTimers();

			const queryPromise = wsClient.query('slowQuery', null);

			vi.advanceTimersByTime(10);

			// Fast-forward time to trigger timeout
			vi.advanceTimersByTime(31000);

			await expect(queryPromise).rejects.toThrow('Request timeout');

			vi.useRealTimers();
			wsClient.disconnect();
		});
	});

	describe('mutation', () => {
		it('should send mutation request and handle response', async () => {
			const mutationPromise = wsClient.mutation('updateUser', {
				id: '123',
				name: 'Jane Doe'
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Verify request was sent
			expect(mockWs.send).toHaveBeenCalledTimes(1);

			// Parse and verify the sent request
			const requestCall = mockWs.send.mock.calls[0][0];
			const request = JSON.parse(requestCall);

			expect(request).toEqual({
				kind: 'request',
				id: expect.any(String),
				type: 'mutation',
				path: 'updateUser',
				input: { id: '123', name: 'Jane Doe' }
			});

			// Verify the request ID format
			expect(request.id).toMatch(/^req_\d+_\d+$/);

			const response: WRPCResponse = {
				kind: 'response',
				id: request.id,
				result: {
					type: 'data',
					data: { success: true, user: { id: '123', name: 'Jane Doe' } }
				}
			};

			mockWs.simulateMessage(JSON.stringify(response));

			const result = await mutationPromise;
			expect(result).toEqual({ success: true, user: { id: '123', name: 'Jane Doe' } });
		});
	});

	describe('server request handling', () => {
		it('should handle server request and send response', async () => {
			// Establish connection
			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Simulate server request
			const serverRequest: WRPCRequest = {
				kind: 'request',
				id: 'server-request-1',
				type: 'mutation',
				path: 'onNotification',
				input: 'Hello from server!'
			};

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			mockWs.simulateMessage(JSON.stringify(serverRequest));

			// Wait for async handling
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Verify response was sent
			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'server-request-1',
					result: {
						type: 'data',
						data: { received: true }
					}
				})
			);

			expect(consoleSpy).toHaveBeenCalledWith('Notification received:', 'Hello from server!');
			consoleSpy.mockRestore();

			wsClient.disconnect();
		});

		it('should handle server request for non-existent procedure', async () => {
			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			const serverRequest: WRPCRequest = {
				kind: 'request',
				id: 'server-request-404',
				type: 'query',
				path: 'nonExistentProcedure',
				input: null
			};

			mockWs.simulateMessage(JSON.stringify(serverRequest));
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'server-request-404',
					result: {
						type: 'error',
						error: {
							message: 'No procedure found at path: nonExistentProcedure',
							code: 'CLIENT_ERROR'
						}
					}
				})
			);

			wsClient.disconnect();
		});

		it('should handle server request that throws error', async () => {
			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			const serverRequest: WRPCRequest = {
				kind: 'request',
				id: 'server-request-error',
				type: 'mutation',
				path: 'throwError',
				input: null
			};

			mockWs.simulateMessage(JSON.stringify(serverRequest));
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockWs.send).toHaveBeenCalledWith(
				JSON.stringify({
					kind: 'response',
					id: 'server-request-error',
					result: {
						type: 'error',
						error: {
							message: 'Client error',
							code: 'CLIENT_ERROR'
						}
					}
				})
			);

			wsClient.disconnect();
		});

		it('should handle invalid server message', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Send invalid JSON
			mockWs.simulateMessage('invalid json');
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(consoleSpy).toHaveBeenCalledWith('Error parsing or validating WebSocket message:', expect.any(Error));

			consoleSpy.mockRestore();
			wsClient.disconnect();
		});
	});

	describe('connection management', () => {
		it('should handle connection close and reject pending requests', async () => {
			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Close connection
			mockWs.simulateClose(1006, 'Connection lost');

			await expect(queryPromise).rejects.toThrow('WebSocket connection closed');
		});

		it('should attempt reconnection on unexpected close', async () => {
			vi.useFakeTimers();

			const queryPromise = wsClient.query('test', null);

			vi.advanceTimersByTime(10);

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Simulate unexpected close (not code 1000)
			mockWs.simulateClose(1006, 'Connection lost');

			// Fast-forward to trigger reconnection attempt
			vi.advanceTimersByTime(2000);

			// Should create a new WebSocket
			expect(MockWebSocket).toHaveBeenCalledTimes(2);

			vi.useRealTimers();
			wsClient.disconnect();
		});

		it('should not reconnect on normal close', async () => {
			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Simulate normal close
			mockWs.simulateClose(1000, 'Normal closure');
			expect(queryPromise).rejects.toThrow('WebSocket connection closed');

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should not create additional WebSocket
			expect(MockWebSocket).toHaveBeenCalledTimes(1);
		});

		it('should disconnect gracefully', async () => {
			const queryPromise = wsClient.query('test', null);

			await new Promise((resolve) => setTimeout(resolve, 10));

			wsClient.disconnect();

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;
			expect(mockWs.close).toHaveBeenCalledWith(1000, 'Client disconnect');
		});

		it('should check connection status correctly', async () => {
			expect(wsClient.isConnected()).toBe(false);

			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(wsClient.isConnected()).toBe(true);

			wsClient.disconnect();
			expect(wsClient.isConnected()).toBe(false);
		});
	});

	describe('response handling', () => {
		it('should handle response for unknown request', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;

			// Send response for unknown request
			const unknownResponse: WRPCResponse = {
				kind: 'response',
				id: 'unknown-request-id',
				result: {
					type: 'data',
					data: 'some data'
				}
			};

			mockWs.simulateMessage(JSON.stringify(unknownResponse));
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(consoleSpy).toHaveBeenCalledWith('Received response for unknown request:', 'unknown-request-id');

			consoleSpy.mockRestore();
			wsClient.disconnect();
		});
	});

	describe('request ID generation', () => {
		it('should generate unique request IDs', async () => {
			const promise1 = wsClient.query('test1', null);
			const promise2 = wsClient.query('test2', null);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockWs = vi.mocked(MockWebSocket).mock.results[0]?.value as any;
			const calls = mockWs.send.mock.calls;

			const request1 = JSON.parse(calls[0][0]);
			const request2 = JSON.parse(calls[1][0]);

			expect(request1.id).not.toBe(request2.id);
			expect(request1.id).toMatch(/^req_\d+_\d+$/);
			expect(request2.id).toMatch(/^req_\d+_\d+$/);

			wsClient.disconnect();
		});
	});
});
