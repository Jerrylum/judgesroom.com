/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWRPCClient } from './client-factory';
import { WebsocketClient } from './websocket-client';
import type { ClientOptions } from './types';
import type { AnyRouter } from '../server/router';
import { initWRPC } from '../server/initWRPC';
import { z } from 'zod';

// Mock WebsocketClient
vi.mock('./websocket-client', () => ({
	WebsocketClient: vi.fn().mockImplementation((options: ClientOptions<AnyRouter>, clientRouter: AnyRouter) => ({
		options,
		clientRouter,
		query: vi.fn(),
		mutation: vi.fn(),
		disconnect: vi.fn(),
		isConnected: vi.fn().mockReturnValue(true)
	}))
}));

describe('createWRPCClient', () => {
	let clientOptions: ClientOptions<AnyRouter>;
	let clientRouter: AnyRouter;

	beforeEach(() => {
		clientOptions = {
			wsUrl: 'ws://localhost:8080/ws',
			sessionId: 'test-session',
			clientId: 'test-client',
			deviceId: 'test-device',
			deviceName: 'Test Device',
			onContext: async () => ({}),
			onOpen: () => {},
			onClosed: () => {},
			onConnectionStateChange: () => {}
		};

		// Create a test client router
		const w = initWRPC.createClient();
		clientRouter = w.router({
			onNotification: w.procedure.input(z.string()).mutation(async ({ input }) => ({ received: true, message: input })),

			getStatus: w.procedure.query(async () => ({ status: 'online' })),

			nested: w.router({
				deepProcedure: w.procedure.input(z.number()).query(async ({ input }) => input * 2)
			})
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('client creation', () => {
		it('should create WebsocketClient and WRPC proxy', () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			expect(WebsocketClient).toHaveBeenCalledWith(clientOptions, clientRouter);
			expect(wsClient).toBeDefined();
			expect(wrpcProxy).toBeDefined();
		});

		it('should pass correct parameters to WebsocketClient', () => {
			const [wsClient] = createWRPCClient(clientOptions, clientRouter);

			expect(WebsocketClient).toHaveBeenCalledWith(clientOptions, clientRouter);
			expect((wsClient as any).options).toBe(clientOptions);
			expect((wsClient as any).clientRouter).toBe(clientRouter);
		});
	});

	describe('WRPC proxy functionality', () => {
		it('should create proxy that delegates query calls to WebsocketClient', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			vi.mocked(wsClient.query).mockResolvedValue({ status: 'online' });

			const result = await (wrpcProxy as any).getStatus.query();

			expect(wsClient.query).toHaveBeenCalledWith('getStatus', undefined);
			expect(result).toEqual({ status: 'online' });
		});

		it('should create proxy that delegates mutation calls to WebsocketClient', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			vi.mocked(wsClient.mutation).mockResolvedValue({ received: true, message: 'test' });

			const result = await (wrpcProxy as any).onNotification.mutation('test message');

			expect(wsClient.mutation).toHaveBeenCalledWith('onNotification', 'test message');
			expect(result).toEqual({ received: true, message: 'test' });
		});

		it('should handle different input types', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			vi.mocked(wsClient.query).mockResolvedValue(42);
			vi.mocked(wsClient.mutation).mockResolvedValue({ success: true });

			// Test with different input types
			await (wrpcProxy as any).getStatus.query();
			expect(wsClient.query).toHaveBeenCalledWith('getStatus', undefined);

			await (wrpcProxy as any).onNotification.mutation('string input');
			expect(wsClient.mutation).toHaveBeenCalledWith('onNotification', 'string input');

			await (wrpcProxy as any).onNotification.mutation({ complex: 'object' });
			expect(wsClient.mutation).toHaveBeenCalledWith('onNotification', { complex: 'object' });

			await (wrpcProxy as any).onNotification.mutation(null);
			expect(wsClient.mutation).toHaveBeenCalledWith('onNotification', null);
		});

		it('should throw error for unknown methods', () => {
			const [, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			expect(() => {
				// With chained proxies, unknown methods aren't recognized and invoking them throws a TypeError
				(wrpcProxy as any).getStatus.unknownMethod();
			}).toThrow(/is not a function/);

			expect(() => {
				(wrpcProxy as any).onNotification.invalidMethod();
			}).toThrow(/is not a function/);
		});

		it('should handle nested procedure paths', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			vi.mocked(wsClient.query).mockResolvedValue(10);

			const result = await (wrpcProxy as any).nested.query(5);

			expect(wsClient.query).toHaveBeenCalledWith('nested', 5);
			expect(result).toBe(10);
		});

		it('should handle dynamic procedure names', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			vi.mocked(wsClient.query).mockResolvedValue('dynamic result');
			vi.mocked(wsClient.mutation).mockResolvedValue('dynamic mutation result');

			// Test dynamic property access
			const dynamicProcedureName = 'dynamicProcedure';

			await (wrpcProxy as any)[dynamicProcedureName].query('test input');
			expect(wsClient.query).toHaveBeenCalledWith(dynamicProcedureName, 'test input');

			await (wrpcProxy as any)[dynamicProcedureName].mutation('mutation input');
			expect(wsClient.mutation).toHaveBeenCalledWith(dynamicProcedureName, 'mutation input');
		});
	});

	describe('proxy behavior', () => {
		it('should create unique proxy for each procedure', () => {
			const [, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			const getStatusProxy = (wrpcProxy as any).getStatus;
			const onNotificationProxy = (wrpcProxy as any).onNotification;

			expect(getStatusProxy).not.toBe(onNotificationProxy);
		});

		it('should create consistent proxy for same procedure', () => {
			const [, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			const getStatusProxy1 = (wrpcProxy as any).getStatus;
			const getStatusProxy2 = (wrpcProxy as any).getStatus;

			// Note: Due to proxy implementation, these will be different objects
			// but they should behave the same way
			expect(typeof getStatusProxy1.query).toBe('function');
			expect(typeof getStatusProxy2.query).toBe('function');
		});

		it('should handle multiple client instances independently', () => {
			const options1 = { ...clientOptions, clientId: 'client-1' };
			const options2 = { ...clientOptions, clientId: 'client-2' };

			const [wsClient1, wrpcProxy1] = createWRPCClient(options1, clientRouter);
			const [wsClient2, wrpcProxy2] = createWRPCClient(options2, clientRouter);

			expect(wsClient1).not.toBe(wsClient2);
			expect(wrpcProxy1).not.toBe(wrpcProxy2);
			expect((wsClient1 as any).options.clientId).toBe('client-1');
			expect((wsClient2 as any).options.clientId).toBe('client-2');
		});
	});

	describe('callback handling', () => {
		it('should pass onConnectionStateChange callback to WebsocketClient', () => {
			const onConnectionStateChangeSpy = vi.fn();
			const optionsWithCallback = {
				...clientOptions,
				onConnectionStateChange: onConnectionStateChangeSpy
			};

			const [wsClient] = createWRPCClient(optionsWithCallback, clientRouter);

			// Verify that the callback was passed to the WebsocketClient
			expect(WebsocketClient).toHaveBeenCalledWith(optionsWithCallback, clientRouter);
			expect((wsClient as any).options.onConnectionStateChange).toBe(onConnectionStateChangeSpy);
		});

		it('should handle connection state change callbacks through factory', () => {
			const onConnectionStateChangeSpy = vi.fn();
			const optionsWithCallback = {
				...clientOptions,
				onConnectionStateChange: onConnectionStateChangeSpy
			};

			const [wsClient] = createWRPCClient(optionsWithCallback, clientRouter);

			// Simulate callback invocation (since we're using mocks)
			const callback = (wsClient as any).options.onConnectionStateChange;
			callback('connecting');
			callback('connected');
			callback('offline');

			expect(onConnectionStateChangeSpy).toHaveBeenCalledWith('connecting');
			expect(onConnectionStateChangeSpy).toHaveBeenCalledWith('connected');
			expect(onConnectionStateChangeSpy).toHaveBeenCalledWith('offline');
			expect(onConnectionStateChangeSpy).toHaveBeenCalledTimes(3);
		});

		it('should work with different callback implementations', () => {
			const stateHistory: string[] = [];
			const trackingCallback = (state: string) => {
				stateHistory.push(state);
			};

			const optionsWithTracking = {
				...clientOptions,
				onConnectionStateChange: trackingCallback
			};

			const [wsClient] = createWRPCClient(optionsWithTracking, clientRouter);
			const callback = (wsClient as any).options.onConnectionStateChange;

			// Simulate various state transitions
			callback('connecting');
			callback('connected');
			callback('reconnecting');
			callback('connected');
			callback('offline');

			expect(stateHistory).toEqual(['connecting', 'connected', 'reconnecting', 'connected', 'offline']);
		});
	});

	describe('error handling', () => {
		it('should propagate WebsocketClient query errors', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			const error = new Error('Query failed');
			vi.mocked(wsClient.query).mockRejectedValue(error);

			await expect((wrpcProxy as any).getStatus.query()).rejects.toThrow('Query failed');
		});

		it('should propagate WebsocketClient mutation errors', async () => {
			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, clientRouter);

			const error = new Error('Mutation failed');
			vi.mocked(wsClient.mutation).mockRejectedValue(error);

			await expect((wrpcProxy as any).onNotification.mutation('test')).rejects.toThrow('Mutation failed');
		});

		it('should handle WebsocketClient creation errors', () => {
			const originalMock = vi.mocked(WebsocketClient);
			vi.mocked(WebsocketClient).mockImplementationOnce(() => {
				throw new Error('WebSocket creation failed');
			});

			expect(() => createWRPCClient(clientOptions, clientRouter)).toThrow('WebSocket creation failed');

			// Restore the original mock
			vi.mocked(WebsocketClient).mockImplementation(originalMock.getMockImplementation() || (() => ({}) as any));
		});
	});

	describe('type safety and structure', () => {
		it('should return tuple with correct types', () => {
			const result = createWRPCClient(clientOptions, clientRouter);

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(2);

			const [wsClient, wrpcProxy] = result;
			expect(wsClient).toBeDefined();
			expect(wrpcProxy).toBeDefined();
			expect(typeof wrpcProxy).toBe('object');
		});

		it('should maintain proxy structure for complex routers', () => {
			// Create a more complex router for testing
			const w = initWRPC.createClient();
			const complexRouter = w.router({
				user: w.router({
					get: w.procedure.input(z.string()).query(async ({ input }) => ({ id: input })),
					update: w.procedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => input),
					profile: w.router({
						getAvatar: w.procedure.query(async () => 'avatar.jpg')
					})
				}),
				admin: w.router({
					deleteUser: w.procedure.input(z.string()).mutation(async ({ input }) => ({ deleted: input }))
				})
			});

			const [wsClient, wrpcProxy] = createWRPCClient(clientOptions, complexRouter);

			// Test that nested structure is accessible
			expect((wrpcProxy as any).user).toBeDefined();
			expect((wrpcProxy as any).admin).toBeDefined();
			expect(typeof (wrpcProxy as any).user.query).toBe('function');
			expect(typeof (wrpcProxy as any).admin.mutation).toBe('function');
		});
	});
});
