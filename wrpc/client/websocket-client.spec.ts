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
	let clientOptions: ClientOptions<AnyRouter>;
	let clientRouter: AnyRouter;
	let wsClient: WebsocketClient<AnyRouter>;

	beforeEach(() => {
		clientOptions = {
			wsUrl: 'ws://localhost:8080/ws',
			sessionId: 'test-session',
			clientId: 'test-client',
			deviceName: 'Test Device',
			onContext: async () => ({}),
			onOpen: () => {},
			onClosed: () => {}
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
			const minimalOptions: ClientOptions<AnyRouter> = {
				wsUrl: 'ws://localhost:8080/ws',
				sessionId: 'test-session',
				clientId: 'test-client',
				deviceName: 'Test Device',
				onContext: async () => ({}),
				onOpen: () => {},
				onClosed: () => {}
			};

			const minimalClient = new WebsocketClient(minimalOptions, clientRouter);
			const queryPromise = minimalClient.query('test', 'input');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(MockWebSocket).toHaveBeenCalledWith(
				'ws://localhost:8080/ws?sessionId=test-session&clientId=test-client&deviceName=Test+Device&action=join'
			);

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

	describe('connection state', () => {
		it('should start with offline connection state', () => {
			expect(wsClient.getConnectionState()).toBe('offline');
		});

		it('should transition through connection states correctly', async () => {
			// Initially offline
			expect(wsClient.getConnectionState()).toBe('offline');

			// Start connection - should be connecting
			const queryPromise = wsClient.query('test', null);
			expect(wsClient.getConnectionState()).toBe('connecting');

			// Wait for connection to establish
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(wsClient.getConnectionState()).toBe('connected');

			// Disconnect
			wsClient.disconnect();
			expect(wsClient.getConnectionState()).toBe('offline');
		});

		it('should set error state on connection failure', async () => {
			// Mock WebSocket constructor to simulate immediate error
			const OriginalWebSocket = global.WebSocket;
			const ErrorWebSocket = vi.fn().mockImplementation((url: string) => {
				const mockWs = {
					readyState: 0,
					url,
					send: vi.fn(),
					close: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
					onopen: null as any,
					onmessage: null as any,
					onclose: null as any,
					onerror: null as any
				};

				// Simulate immediate error
				setTimeout(() => {
					if (mockWs.onerror) {
						mockWs.onerror(new Event('error'));
					}
				}, 0);

				return mockWs;
			});

			global.WebSocket = ErrorWebSocket as any;

			try {
				await wsClient.query('test', 'input');
			} catch (error) {
				// Expected to fail
			}

			expect(wsClient.getConnectionState()).toBe('error');

			global.WebSocket = OriginalWebSocket;
		});

		it('should set reconnecting state on unexpected close', async () => {
			vi.useFakeTimers();

			const queryPromise = wsClient.query('test', null);
			vi.advanceTimersByTime(10);

			expect(wsClient.getConnectionState()).toBe('connected');

			const mockWs = MockWebSocket.mock.results[0]?.value as any;

			// Simulate unexpected close (not code 1000)
			mockWs.simulateClose(1006, 'Connection lost');

			expect(wsClient.getConnectionState()).toBe('reconnecting');

			vi.useRealTimers();
			wsClient.disconnect();
		});

		it.skip('should set offline state on normal close', async () => {
			const queryPromise = wsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(wsClient.getConnectionState()).toBe('connected');

			const mockWs = MockWebSocket.mock.results[0]?.value as any;

			// Simulate normal close
			mockWs.simulateClose(1000, 'Normal closure');

			expect(wsClient.getConnectionState()).toBe('offline');
		});

		it('should maintain connection state through multiple operations', async () => {
			// Start with offline
			expect(wsClient.getConnectionState()).toBe('offline');

			// Make a request to establish connection
			const promise1 = wsClient.query('test1', null);
			expect(wsClient.getConnectionState()).toBe('connecting');

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(wsClient.getConnectionState()).toBe('connected');

			// Additional requests should maintain connected state
			wsClient.mutation('test2', null).catch(() => {}); // Handle rejection
			expect(wsClient.getConnectionState()).toBe('connected');

			wsClient.disconnect();
			expect(wsClient.getConnectionState()).toBe('offline');

			// Clean up the first promise
			promise1.catch(() => {}); // Handle rejection
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

	describe('Context handling', () => {
		interface TestContext {
			userId: string;
			sessionToken: string;
			permissions: string[];
		}

		let contextOptions: ClientOptions<AnyRouter>;
		let contextRouter: AnyRouter;
		let contextWsClient: WebsocketClient<AnyRouter>;

		beforeEach(() => {
			// Create context-aware client options
			contextOptions = {
				wsUrl: 'ws://localhost:8080/ws',
				sessionId: 'context-session',
				clientId: 'context-client',
				deviceName: 'Context Test Device',
				onContext: async (request) => {
					// Simulate context generation based on request
					const context: TestContext = {
						userId: 'test-user-123',
						sessionToken: 'token-' + request.id,
						permissions: request.path === 'getClientInfo' ? ['admin'] : ['user']
					};
					return context;
				},
				onOpen: () => {},
				onClosed: () => {}
			};

			// Create a context-aware client router using existing procedures
			const w = initWRPC.createClient<any, TestContext>();
			contextRouter = w.router({
				onNotification: w.procedure.input(z.string()).mutation(async ({ input, ctx }) => {
					console.log('Notification received:', input);
					return {
						received: true,
						processedBy: ctx.userId,
						token: ctx.sessionToken,
						permissions: ctx.permissions
					};
				}),

				getClientInfo: w.procedure.query(async ({ ctx }) => {
					if (ctx.permissions && !ctx.permissions.includes('admin')) {
						throw new Error('Admin access required');
					}
					return {
						clientId: 'test-client',
						status: 'online',
						userId: ctx.userId,
						token: ctx.sessionToken,
						permissions: ctx.permissions
					};
				}),

				throwError: w.procedure.mutation(async ({ ctx }) => {
					return {
						error: 'Client error',
						context: ctx
					};
				})
			});

			contextWsClient = new WebsocketClient(contextOptions, contextRouter);
		});

		afterEach(() => {
			contextWsClient.disconnect();
		});

		it('should call onContext when receiving server requests', async () => {
			const onContextSpy = vi.spyOn(contextOptions, 'onContext');

			// Trigger connection by making a query
			const queryPromise = contextWsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance that was just created
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate server request
			const serverRequest: WRPCRequest = {
				kind: 'request',
				id: 'server-req-123',
				type: 'mutation',
				path: 'onNotification',
				input: 'test-action'
			};

			mockWs.simulateMessage(JSON.stringify(serverRequest));

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(onContextSpy).toHaveBeenCalledWith(serverRequest);
			contextWsClient.disconnect();
		});

		it('should pass context to client procedure handlers', async () => {
			// Trigger connection by making a query
			const queryPromise = contextWsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate server request
			const serverRequest: WRPCRequest = {
				kind: 'request',
				id: 'context-test-456',
				type: 'mutation',
				path: 'onNotification',
				input: 'context-test'
			};

			mockWs.simulateMessage(JSON.stringify(serverRequest));

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that response includes context data
			expect(mockWs.send).toHaveBeenCalledTimes(2); // Initial query + response to server request
			const response = JSON.parse(mockWs.send.mock.calls[1][0]); // Second call is the response to server request
			expect(response.result.data).toEqual({
				received: true,
				processedBy: 'test-user-123',
				token: 'token-context-test-456',
				permissions: ['user']
			});
		});

		it('should generate admin permissions for admin paths', async () => {
			// Trigger connection by making a query
			const queryPromise = contextWsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate server request with admin path
			const adminRequest: WRPCRequest = {
				kind: 'request',
				id: 'admin-req-789',
				type: 'query',
				path: 'getClientInfo',
				input: undefined
			};

			mockWs.simulateMessage(JSON.stringify(adminRequest));

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that response includes admin context
			expect(mockWs.send).toHaveBeenCalledTimes(2); // Initial query + response to server request
			const response = JSON.parse(mockWs.send.mock.calls[1][0]); // Second call is the response to server request
			expect(response.result.data).toEqual({
				clientId: 'test-client',
				status: 'online',
				userId: 'test-user-123',
				token: 'token-admin-req-789',
				permissions: ['admin']
			});
		});

		it('should handle context-based authorization failures', async () => {
			// Create a client with restricted context
			const restrictedOptions = {
				...contextOptions,
				onContext: async () => ({
					userId: 'restricted-user',
					sessionToken: 'restricted-token',
					permissions: ['user'] // No admin permission
				})
			};

			const restrictedClient = new WebsocketClient(restrictedOptions, contextRouter);

			// Trigger connection by making a query
			const queryPromise = restrictedClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance for the restricted client
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate admin request
			const adminRequest: WRPCRequest = {
				kind: 'request',
				id: 'restricted-admin-req',
				type: 'query',
				path: 'getClientInfo',
				input: undefined
			};

			mockWs.simulateMessage(JSON.stringify(adminRequest));

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that response contains error
			expect(mockWs.send).toHaveBeenCalledTimes(2); // Initial query + response to server request
			const response = JSON.parse(mockWs.send.mock.calls[1][0]); // Second call is the response to server request
			expect(response.result.type).toBe('error');
			expect(response.result.error.message).toBe('Admin access required');

			restrictedClient.disconnect();
		});

		it('should return full context when requested', async () => {
			// Trigger connection by making a query
			const queryPromise = contextWsClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate server request for context info
			const contextRequest: WRPCRequest = {
				kind: 'request',
				id: 'context-info-req',
				type: 'mutation',
				path: 'throwError',
				input: undefined
			};

			mockWs.simulateMessage(JSON.stringify(contextRequest));

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that response contains full context
			expect(mockWs.send).toHaveBeenCalledTimes(2); // Initial query + response to server request
			const response = JSON.parse(mockWs.send.mock.calls[1][0]); // Second call is the response to server request
			expect(response.result.data).toEqual({
				error: 'Client error',
				context: {
					userId: 'test-user-123',
					sessionToken: 'token-context-info-req',
					permissions: ['user']
				}
			});
		});

		it('should handle async context generation', async () => {
			// Create client with async context generation
			const asyncContextOptions = {
				...contextOptions,
				onContext: async (request: WRPCRequest) => {
					// Simulate async operation (e.g., database lookup)
					await new Promise((resolve) => setTimeout(resolve, 5));

					return {
						userId: 'async-user',
						sessionToken: 'async-token-' + request.id,
						permissions: ['async-permission']
					};
				}
			};

			const asyncClient = new WebsocketClient(asyncContextOptions, contextRouter);

			// Trigger connection by making a query
			const queryPromise = asyncClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance for the async client
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate server request
			const asyncRequest: WRPCRequest = {
				kind: 'request',
				id: 'async-req',
				type: 'mutation',
				path: 'onNotification',
				input: 'async-test'
			};

			mockWs.simulateMessage(JSON.stringify(asyncRequest));

			await new Promise((resolve) => setTimeout(resolve, 20));

			// Check that response includes async context data
			expect(mockWs.send).toHaveBeenCalledTimes(2); // Initial query + response to server request
			const response = JSON.parse(mockWs.send.mock.calls[1][0]); // Second call is the response to server request
			expect(response.result.data.received).toBe(true);
			expect(response.result.data.processedBy).toBe('async-user');
			expect(response.result.data.token).toBe('async-token-async-req');
			expect(response.result.data.permissions).toEqual(['async-permission']);

			asyncClient.disconnect();
		});

		it('should handle context generation errors gracefully', async () => {
			// Create client with failing context generation
			const failingContextOptions = {
				...contextOptions,
				onContext: async () => {
					throw new Error('Context generation failed');
				}
			};

			const failingClient = new WebsocketClient(failingContextOptions, contextRouter);
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Trigger connection by making a query
			const queryPromise = failingClient.query('test', null);
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Get the mock WebSocket instance for the failing client
			const mockWs = vi.mocked(MockWebSocket).mock.results[vi.mocked(MockWebSocket).mock.results.length - 1]?.value as any;

			// Simulate server request
			const failingRequest: WRPCRequest = {
				kind: 'request',
				id: 'failing-req',
				type: 'query',
				path: 'getClientInfo',
				input: undefined
			};

			mockWs.simulateMessage(JSON.stringify(failingRequest));

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that error was logged
			expect(consoleSpy).toHaveBeenCalledWith('Error parsing or validating WebSocket message:', expect.any(Error));

			failingClient.disconnect();
			consoleSpy.mockRestore();
		});
	});
});
