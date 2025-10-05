/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WRPCClientManager, createClientManager } from './client-manager';
import type { ClientOptions } from './types';
import type { AnyRouter } from '../server/router';
import type { ConnectionState } from './websocket-client';
import { initWRPC } from '../server/initWRPC';
import { z } from 'zod';

// Mock WebsocketClient
class MockWebsocketClient {
	constructor(
		public options: ClientOptions<AnyRouter>,
		public clientRouter: AnyRouter
	) {}

	query = vi.fn();
	mutation = vi.fn();
	disconnect = vi.fn();
	isConnected = vi.fn().mockReturnValue(true);
	getConnectionState = vi.fn().mockReturnValue('connected' as ConnectionState);
}

// Mock createWRPCClient
vi.mock('./client-factory', () => ({
	createWRPCClient: vi.fn().mockImplementation((options: ClientOptions<AnyRouter>, clientRouter: AnyRouter) => {
		const mockClient = new MockWebsocketClient(options, clientRouter);
		const mockWRPC = {
			testProcedure: {
				query: vi.fn(),
				mutation: vi.fn()
			},
			anotherProcedure: {
				query: vi.fn(),
				mutation: vi.fn()
			}
		};
		return [mockClient, mockWRPC];
	})
}));

describe('WRPCClientManager', () => {
	let clientManager: WRPCClientManager<AnyRouter, AnyRouter>;
	let mockCreateOptions: () => ClientOptions<AnyRouter>;
	let clientRouter: AnyRouter;

	beforeEach(() => {
		mockCreateOptions = vi.fn().mockReturnValue({
			wsUrl: 'ws://localhost:8080/ws',
			sessionId: 'test-session',
			clientId: 'test-client',
			deviceName: 'Test Device'
		});

		// Create a test client router
		const w = initWRPC.createClient();
		clientRouter = w.router({
			onNotification: w.procedure.input(z.string()).mutation(async ({ input }) => ({ received: true, message: input })),

			getStatus: w.procedure.query(async () => ({ status: 'online' }))
		});

		clientManager = new WRPCClientManager(mockCreateOptions, clientRouter);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create client manager with factory function and router', () => {
			expect(clientManager).toBeInstanceOf(WRPCClientManager);
		});

		it('should not create client instance on construction', () => {
			expect(mockCreateOptions).not.toHaveBeenCalled();
		});
	});

	describe('getClient', () => {
		it('should create client instance on first call', () => {
			const [wsClient, wrpcClient] = clientManager.getClient();

			expect(mockCreateOptions).toHaveBeenCalledTimes(1);
			expect(wsClient).toBeInstanceOf(MockWebsocketClient);
			expect(wrpcClient).toBeDefined();
			expect(wrpcClient.testProcedure).toBeDefined();
		});

		it('should return same client instance on subsequent calls', () => {
			const [wsClient1, wrpcClient1] = clientManager.getClient();
			const [wsClient2, wrpcClient2] = clientManager.getClient();

			expect(mockCreateOptions).toHaveBeenCalledTimes(1);
			expect(wsClient1).toBe(wsClient2);
			expect(wrpcClient1).toBe(wrpcClient2);
		});

		it('should pass correct options to client factory', () => {
			const expectedOptions = {
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

			vi.mocked(mockCreateOptions).mockReturnValue(expectedOptions);

			const [wsClient] = clientManager.getClient();

			expect((wsClient as any).options).toEqual(expectedOptions);
			expect((wsClient as any).clientRouter).toBe(clientRouter);
		});

		it('should call options factory each time new client is created', () => {
			clientManager.getClient();
			clientManager.resetClient();
			clientManager.getClient();

			expect(mockCreateOptions).toHaveBeenCalledTimes(2);
		});
	});

	describe('resetClient', () => {
		it('should disconnect existing client when resetting', () => {
			const [wsClient] = clientManager.getClient();
			const disconnectSpy = wsClient.disconnect;

			clientManager.resetClient();

			expect(disconnectSpy).toHaveBeenCalledTimes(1);
		});

		it('should create new client instance after reset', () => {
			const [wsClient1] = clientManager.getClient();
			clientManager.resetClient();
			const [wsClient2] = clientManager.getClient();

			expect(wsClient1).not.toBe(wsClient2);
			expect(mockCreateOptions).toHaveBeenCalledTimes(2);
		});

		it('should handle reset when no client exists', () => {
			expect(() => clientManager.resetClient()).not.toThrow();
		});
	});

	describe('isConnected', () => {
		it('should return false when no client exists', () => {
			expect(clientManager.isConnected()).toBe(false);
		});

		it('should return client connection status when client exists', () => {
			const [wsClient] = clientManager.getClient();
			vi.mocked(wsClient.isConnected).mockReturnValue(true);

			expect(clientManager.isConnected()).toBe(true);

			vi.mocked(wsClient.isConnected).mockReturnValue(false);
			expect(clientManager.isConnected()).toBe(false);
		});

		it('should return false after client reset', () => {
			clientManager.getClient();
			expect(clientManager.isConnected()).toBe(true);

			clientManager.resetClient();
			expect(clientManager.isConnected()).toBe(false);
		});
	});

	describe('getConnectionState', () => {
		it('should return offline when no client exists', () => {
			expect(clientManager.getConnectionState()).toBe('offline');
		});

		it('should return client connection state when client exists', () => {
			const [wsClient] = clientManager.getClient();
			vi.mocked(wsClient.getConnectionState).mockReturnValue('connected');

			expect(clientManager.getConnectionState()).toBe('connected');

			vi.mocked(wsClient.getConnectionState).mockReturnValue('connecting');
			expect(clientManager.getConnectionState()).toBe('connecting');

			vi.mocked(wsClient.getConnectionState).mockReturnValue('error');
			expect(clientManager.getConnectionState()).toBe('error');

			vi.mocked(wsClient.getConnectionState).mockReturnValue('reconnecting');
			expect(clientManager.getConnectionState()).toBe('reconnecting');
		});

		it('should return offline after client reset', () => {
			const [wsClient] = clientManager.getClient();
			vi.mocked(wsClient.getConnectionState).mockReturnValue('connected');
			expect(clientManager.getConnectionState()).toBe('connected');

			clientManager.resetClient();
			expect(clientManager.getConnectionState()).toBe('offline');
		});

		it('should handle all connection states', () => {
			const [wsClient] = clientManager.getClient();
			const states: ConnectionState[] = ['offline', 'connecting', 'connected', 'reconnecting', 'error'];

			states.forEach((state) => {
				vi.mocked(wsClient.getConnectionState).mockReturnValue(state);
				expect(clientManager.getConnectionState()).toBe(state);
			});
		});
	});

	describe('integration scenarios', () => {
		it('should handle client lifecycle properly', () => {
			// Initially not connected and offline
			expect(clientManager.isConnected()).toBe(false);
			expect(clientManager.getConnectionState()).toBe('offline');

			// Create client
			const [wsClient1, wrpcClient1] = clientManager.getClient();
			expect(clientManager.isConnected()).toBe(true);
			expect(clientManager.getConnectionState()).toBe('connected');

			// Reset client
			clientManager.resetClient();
			expect(clientManager.isConnected()).toBe(false);
			expect(clientManager.getConnectionState()).toBe('offline');
			expect(wsClient1.disconnect).toHaveBeenCalled();

			// Create new client
			const [wsClient2, wrpcClient2] = clientManager.getClient();
			expect(clientManager.isConnected()).toBe(true);
			expect(clientManager.getConnectionState()).toBe('connected');
			expect(wsClient2).not.toBe(wsClient1);
			expect(wrpcClient2).not.toBe(wrpcClient1);
		});

		it('should pass onConnectionStateChange callback to underlying client', () => {
			const onConnectionStateChangeSpy = vi.fn();
			const optionsWithCallback = vi.fn().mockReturnValue({
				wsUrl: 'ws://localhost:8080/ws',
				sessionId: 'test-session',
				clientId: 'test-client',
				deviceId: 'test-device',
				deviceName: 'Test Device',
				onContext: async () => ({}),
				onOpen: () => {},
				onClosed: () => {},
				onConnectionStateChange: onConnectionStateChangeSpy
			});

			const managerWithCallback = new WRPCClientManager(optionsWithCallback, clientRouter);
			const [wsClient] = managerWithCallback.getClient();

			// Verify that the callback was passed to the underlying WebsocketClient
			expect((wsClient as any).options.onConnectionStateChange).toBe(onConnectionStateChangeSpy);
		});

		it('should handle connection state changes through callback', () => {
			const onConnectionStateChangeSpy = vi.fn();
			const optionsWithCallback = vi.fn().mockReturnValue({
				wsUrl: 'ws://localhost:8080/ws',
				sessionId: 'test-session',
				clientId: 'test-client',
				deviceId: 'test-device',
				deviceName: 'Test Device',
				onContext: async () => ({}),
				onOpen: () => {},
				onClosed: () => {},
				onConnectionStateChange: onConnectionStateChangeSpy
			});

			const managerWithCallback = new WRPCClientManager(optionsWithCallback, clientRouter);

			// Create client - this should trigger the callback through the mock
			const [wsClient] = managerWithCallback.getClient();

			// Simulate state change by calling the callback directly
			// (since we're using mocks, we can test that the callback is properly wired)
			const callback = (wsClient as any).options.onConnectionStateChange;
			callback('connecting');
			callback('connected');

			expect(onConnectionStateChangeSpy).toHaveBeenCalledWith('connecting');
			expect(onConnectionStateChangeSpy).toHaveBeenCalledWith('connected');
			expect(onConnectionStateChangeSpy).toHaveBeenCalledTimes(2);
		});

		it('should handle dynamic options', () => {
			let sessionId = 'session-1';
			vi.mocked(mockCreateOptions).mockImplementation(() => ({
				wsUrl: 'ws://localhost:8080/ws',
				sessionId,
				clientId: 'test-client',
				deviceId: 'test-device',
				deviceName: 'Test Device',
				onContext: async () => ({}),
				onOpen: () => {},
				onClosed: () => {},
				onConnectionStateChange: () => {}
			}));

			const [wsClient1] = clientManager.getClient();
			expect((wsClient1 as any).options.sessionId).toBe('session-1');

			// Change session and reset
			sessionId = 'session-2';
			clientManager.resetClient();

			const [wsClient2] = clientManager.getClient();
			expect((wsClient2 as any).options.sessionId).toBe('session-2');
		});

		it('should handle multiple client managers independently', () => {
			const manager2 = new WRPCClientManager(
				() => ({
					wsUrl: 'ws://other:8080/ws',
					sessionId: 'test-session',
					clientId: 'test-client',
					deviceId: 'test-device',
					deviceName: 'Test Device',
					onContext: async () => ({}),
					onOpen: () => {},
					onClosed: () => {},
					onConnectionStateChange: () => {}
				}),
				clientRouter
			);

			const [client1] = clientManager.getClient();
			const [client2] = manager2.getClient();

			expect(client1).not.toBe(client2);
			expect((client1 as any).options.wsUrl).toBe('ws://localhost:8080/ws');
			expect((client2 as any).options.wsUrl).toBe('ws://other:8080/ws');

			// Both should have their own connection states
			expect(clientManager.getConnectionState()).toBe('connected');
			expect(manager2.getConnectionState()).toBe('connected');

			// Reset one shouldn't affect the other
			clientManager.resetClient();
			expect(clientManager.getConnectionState()).toBe('offline');
			expect(manager2.getConnectionState()).toBe('connected');
		});
	});
});

describe('createClientManager', () => {
	it('should create WRPCClientManager instance', () => {
		const mockCreateOptions = () => ({
			wsUrl: 'ws://localhost:8080/ws',
			sessionId: 'test-session',
			clientId: 'test-client',
			deviceId: 'test-device',
			deviceName: 'Test Device',
			onContext: async () => ({}),
			onOpen: () => {},
			onClosed: () => {},
			onConnectionStateChange: () => {}
		});

		const w = initWRPC.createClient();
		const clientRouter = w.router({
			test: w.procedure.query(async () => 'test')
		});

		const manager = createClientManager(mockCreateOptions, clientRouter);

		expect(manager).toBeInstanceOf(WRPCClientManager);
	});

	it('should pass parameters correctly to constructor', () => {
		const mockCreateOptions = vi.fn().mockReturnValue({
			wsUrl: 'ws://localhost:8080/ws'
		});

		const w = initWRPC.createClient();
		const clientRouter = w.router({
			test: w.procedure.query(async () => 'test')
		});

		const manager = createClientManager(mockCreateOptions, clientRouter);
		const [wsClient] = manager.getClient();

		expect(mockCreateOptions).toHaveBeenCalled();
		expect((wsClient as any).clientRouter).toBe(clientRouter);
	});
});
