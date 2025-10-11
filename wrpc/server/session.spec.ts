/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServerSideSession } from './session';
import type { Network } from './types';
import type { WRPCRequest, WRPCResponse } from './messages';

describe('Server-side Session', () => {
	let mockNetwork: Network;
	let session: ReturnType<typeof createServerSideSession>;

	beforeEach(() => {
		mockNetwork = {
			sendToClient: vi.fn(),
			broadcast: vi.fn(),
			getConnectedClients: vi.fn(),
			isClientConnected: vi.fn(),
			isDeviceConnected: vi.fn(),
			getAllClientData: vi.fn(),
			getClientData: vi.fn(),
			kickClient: vi.fn(),
			destroy: vi.fn()
		};

		session = createServerSideSession(mockNetwork, 'test-session-id', 'test-client-id', 'test-device-id', 'Test Device');
	});

	describe('session metadata', () => {
		it('should have correct sessionId', () => {
			expect(session.sessionId).toBe('test-session-id');
		});

		it('should have correct currentClient metadata', () => {
			expect(session.currentClient).toEqual({
				clientId: 'test-client-id',
				deviceId: 'test-device-id',
				deviceName: 'Test Device'
			});
		});
	});

	describe('getClient', () => {
		it('should create a client proxy that can call query procedures', async () => {
			const mockResponse: WRPCResponse = {
				kind: 'response',
				id: 'test-id',
				result: { type: 'data', data: 'test result' }
			};

			vi.mocked(mockNetwork.sendToClient).mockResolvedValue(mockResponse);

			const clientProxy = session.getClient('target-client-id');
			const result = await (clientProxy as any).testProcedure.query('test input');

			expect(mockNetwork.sendToClient).toHaveBeenCalledWith(
				'target-client-id',
				expect.objectContaining({
					kind: 'request',
					type: 'query',
					path: 'testProcedure',
					input: 'test input',
					id: expect.any(String)
				})
			);
			expect(result).toBe('test result');
		});

		it('should create a client proxy that can call mutation procedures', async () => {
			const mockResponse: WRPCResponse = {
				kind: 'response',
				id: 'test-id',
				result: { type: 'data', data: 'mutation result' }
			};

			vi.mocked(mockNetwork.sendToClient).mockResolvedValue(mockResponse);

			const clientProxy = session.getClient('target-client-id');
			const result = await (clientProxy as any).updateData.mutation({ value: 42 });

			expect(mockNetwork.sendToClient).toHaveBeenCalledWith(
				'target-client-id',
				expect.objectContaining({
					kind: 'request',
					type: 'mutation',
					path: 'updateData',
					input: { value: 42 },
					id: expect.any(String)
				})
			);
			expect(result).toBe('mutation result');
		});

		it('should handle nested router properties', async () => {
			const mockResponse: WRPCResponse = {
				kind: 'response',
				id: 'test-id',
				result: { type: 'data', data: 'nested result' }
			};

			vi.mocked(mockNetwork.sendToClient).mockResolvedValue(mockResponse);

			const clientProxy = session.getClient('target-client-id');
			const result = await (clientProxy as any).nested.query('nested input');

			expect(mockNetwork.sendToClient).toHaveBeenCalledWith(
				'target-client-id',
				expect.objectContaining({
					kind: 'request',
					type: 'query',
					path: 'nested',
					input: 'nested input',
					id: expect.any(String)
				})
			);
			expect(result).toBe('nested result');
		});

		it('should support multi-segment nested paths for client query', async () => {
			const mockResponse: WRPCResponse = {
				kind: 'response',
				id: 'test-id',
				result: { type: 'data', data: 'multi nested result' }
			};

			vi.mocked(mockNetwork.sendToClient).mockResolvedValue(mockResponse);

			const clientProxy = session.getClient('target-client-id');
			const result = await (clientProxy as any).handshake.createJudgesRoom.query({ ok: true });

			expect(mockNetwork.sendToClient).toHaveBeenCalledWith(
				'target-client-id',
				expect.objectContaining({
					kind: 'request',
					type: 'query',
					path: 'handshake.createJudgesRoom',
					input: { ok: true },
					id: expect.any(String)
				})
			);
			expect(result).toBe('multi nested result');
		});
	});

	describe('broadcast', () => {
		it('should create a broadcast proxy that can call procedures on all clients', async () => {
			const mockResponses: WRPCResponse[] = [
				{
					kind: 'response',
					id: 'test-id-client1',
					result: { type: 'data', data: 'response from client 1' }
				},
				{
					kind: 'response',
					id: 'test-id-client2',
					result: { type: 'data', data: 'response from client 2' }
				}
			];

			vi.mocked(mockNetwork.broadcast).mockResolvedValue(mockResponses);

			const broadcastProxy = session.broadcast();
			const results = await (broadcastProxy as any).notifyAll.mutation('broadcast message');

			expect(mockNetwork.broadcast).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'request',
					type: 'mutation',
					path: 'notifyAll',
					input: 'broadcast message',
					id: expect.any(String)
				})
			);
			expect(results).toBe(mockResponses);
		});

		it('should support multi-segment nested paths for broadcast mutation', async () => {
			const mockResponses: WRPCResponse[] = [
				{ kind: 'response', id: 'id-1', result: { type: 'data', data: 1 } },
				{ kind: 'response', id: 'id-2', result: { type: 'data', data: 2 } }
			];

			vi.mocked(mockNetwork.broadcast).mockResolvedValue(mockResponses);

			const broadcastProxy = session.broadcast();
			const results = await (broadcastProxy as any).handshake.createJudgesRoom.mutation({ a: 1 });

			expect(mockNetwork.broadcast).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'request',
					type: 'mutation',
					path: 'handshake.createJudgesRoom',
					input: { a: 1 },
					id: expect.any(String)
				})
			);
			expect(results).toEqual(mockResponses);
		});
	});

	describe('getServer', () => {
		it('should throw an error when called from server-side session', () => {
			expect(() => session.getServer()).toThrow(
				'getServer() cannot be called from server-side session. Server procedures should be called directly.'
			);
		});
	});
});
