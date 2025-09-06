/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClientSideSession } from './session';
import type { WebsocketClient } from './websocket-client';
import type { AnyRouter } from '../server';

describe('Client-side Session', () => {
	let mockWsClient: WebsocketClient<AnyRouter>;
	let session: ReturnType<typeof createClientSideSession<AnyRouter, AnyRouter>>;

	beforeEach(() => {
		mockWsClient = {
			query: vi.fn(),
			mutation: vi.fn(),
			disconnect: vi.fn(),
			isConnected: vi.fn()
		} as unknown as WebsocketClient<AnyRouter>;

		session = createClientSideSession(mockWsClient, 'test-session-id', 'test-client-id', 'Test Device');
	});

	describe('session metadata', () => {
		it('should have correct sessionId', () => {
			expect(session.sessionId).toBe('test-session-id');
		});

		it('should have correct currentClient metadata', () => {
			expect(session.currentClient).toEqual({
				clientId: 'test-client-id',
				deviceName: 'Test Device'
			});
		});
	});

	describe('getServer', () => {
		it('should create a server proxy that can call query procedures', async () => {
			vi.mocked(mockWsClient.query).mockResolvedValue('query result');

			const serverProxy = session.getServer();
			const result = await (serverProxy as any).getData.query('test input');

			expect(mockWsClient.query).toHaveBeenCalledWith('getData', 'test input');
			expect(result).toBe('query result');
		});

		it('should create a server proxy that can call mutation procedures', async () => {
			vi.mocked(mockWsClient.mutation).mockResolvedValue('mutation result');

			const serverProxy = session.getServer();
			const result = await (serverProxy as any).updateData.mutation({ value: 42 });

			expect(mockWsClient.mutation).toHaveBeenCalledWith('updateData', { value: 42 });
			expect(result).toBe('mutation result');
		});

		it('should support multi-segment nested paths for query', async () => {
			vi.mocked(mockWsClient.query).mockResolvedValue('multi result');

			const serverProxy = session.getServer();
			const result = await (serverProxy as any).handshake.createSession.query({ foo: 'bar' });

			expect(mockWsClient.query).toHaveBeenCalledWith('handshake.createSession', { foo: 'bar' });
			expect(result).toBe('multi result');
		});

		it('should support multi-segment nested paths for mutation', async () => {
			vi.mocked(mockWsClient.mutation).mockResolvedValue('multi mutation');

			const serverProxy = session.getServer();
			const result = await (serverProxy as any).handshake.createSession.mutation({ a: 1 });

			expect(mockWsClient.mutation).toHaveBeenCalledWith('handshake.createSession', { a: 1 });
			expect(result).toBe('multi mutation');
		});
	});

	describe('getClient', () => {
		it('should throw an error when called from client-side session', () => {
			expect(() => session.getClient('some-client-id')).toThrow(
				'getClient() cannot be called from client-side session. Clients cannot call other clients directly.'
			);
		});
	});

	describe('broadcast', () => {
		it('should throw an error when called from client-side session', () => {
			expect(() => session.broadcast()).toThrow(
				'broadcast() cannot be called from client-side session. Clients cannot broadcast to other clients.'
			);
		});
	});
});
