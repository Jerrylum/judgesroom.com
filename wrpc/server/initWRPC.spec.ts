/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initWRPC, WRPCBuilder } from './initWRPC';
import { z } from 'zod';

describe('initWRPC', () => {
	describe('WRPCBuilder', () => {
		let builder: WRPCBuilder<Record<string, never>>;

		beforeEach(() => {
			builder = new WRPCBuilder();
		});

		describe('meta', () => {
			it('should create a new builder with meta type', () => {
				interface TestMeta {
					description: string;
					version: number;
				}

				const metaBuilder = builder.meta<TestMeta>();

				expect(metaBuilder).toBeInstanceOf(WRPCBuilder);
				expect(metaBuilder).not.toBe(builder);
			});
		});

		describe('createServer', () => {
			it('should create a server root object with default configuration', () => {
				const server = builder.createServer();

				expect(server).toHaveProperty('_config');
				expect(server).toHaveProperty('procedure');
				expect(server).toHaveProperty('router');
				expect(server).toHaveProperty('mergeRouters');

				expect(server._config).toEqual({
					meta: {},
					$types: null
				});
			});

			it('should create a server with custom meta', () => {
				interface TestMeta {
					description: string;
					version: number;
				}

				const metaBuilder = builder.meta<TestMeta>();
				const defaultMeta = {
					description: 'Test server',
					version: 1
				};

				const server = metaBuilder.createServer({
					defaultMeta
				});

				expect(server._config.meta).toEqual(defaultMeta);
			});

			it('should provide a working procedure builder', () => {
				const server = builder.createServer();

				expect(server.procedure).toBeDefined();
				expect(server.procedure._def).toEqual({
					procedure: true,
					inputs: []
				});

				// Test that we can chain methods
				const procedureWithInput = server.procedure.input(z.string());
				expect(procedureWithInput._def.inputs).toHaveLength(1);
			});

			it('should provide a working router factory', () => {
				const server = builder.createServer();
				const mockProcedure = vi.fn() as any;
				mockProcedure._def = {
					procedure: true,
					type: 'query',
					$types: null,
					meta: undefined
				};

				const router = server.router({
					test: mockProcedure
				});

				expect(router._def).toEqual({
					_config: server._config,
					router: true,
					record: {
						test: mockProcedure
					}
				});
			});

			it('should provide mergeRouters functionality', () => {
				const server = builder.createServer();

				expect(server.mergeRouters).toBeDefined();
				expect(typeof server.mergeRouters).toBe('function');
			});
		});

		describe('createClient', () => {
			it('should create a client root object with default configuration', () => {
				const client = builder.createClient();

				expect(client).toHaveProperty('_config');
				expect(client).toHaveProperty('procedure');
				expect(client).toHaveProperty('router');
				expect(client).toHaveProperty('mergeRouters');

				expect(client._config).toEqual({
					meta: {},
					$types: null
				});
			});

			it('should create a client with custom meta', () => {
				interface TestMeta {
					description: string;
					timeout: number;
				}

				const metaBuilder = builder.meta<TestMeta>();
				const defaultMeta = {
					description: 'Test client',
					timeout: 5000
				};

				const client = metaBuilder.createClient({
					defaultMeta
				});

				expect(client._config.meta).toEqual(defaultMeta);
			});

			it('should provide a working procedure builder for client', () => {
				const client = builder.createClient();

				expect(client.procedure).toBeDefined();
				expect(client.procedure._def).toEqual({
					procedure: true,
					inputs: []
				});

				// Test that we can chain methods
				const procedureWithInput = client.procedure.input(z.string());
				expect(procedureWithInput._def.inputs).toHaveLength(1);
			});

			it('should provide a working router factory for client', () => {
				const client = builder.createClient();
				const mockProcedure = vi.fn() as any;
				mockProcedure._def = {
					procedure: true,
					type: 'query',
					$types: null,
					meta: undefined
				};

				const router = client.router({
					clientMethod: mockProcedure
				});

				expect(router._def).toEqual({
					_config: client._config,
					router: true,
					record: {
						clientMethod: mockProcedure
					}
				});
			});
		});
	});

	describe('initWRPC singleton', () => {
		it('should be an instance of WRPCBuilder', () => {
			expect(initWRPC).toBeInstanceOf(WRPCBuilder);
		});

		it('should provide the same interface as WRPCBuilder', () => {
			expect(initWRPC).toHaveProperty('meta');
			expect(initWRPC).toHaveProperty('createServer');
			expect(initWRPC).toHaveProperty('createClient');
		});

		it('should create working server instances', () => {
			const server = initWRPC.createServer();

			expect(server).toBeDefined();
			expect(server._config).toBeDefined();
			expect(server.procedure).toBeDefined();
			expect(server.router).toBeDefined();
		});

		it('should create working client instances', () => {
			const client = initWRPC.createClient();

			expect(client).toBeDefined();
			expect(client._config).toBeDefined();
			expect(client.procedure).toBeDefined();
			expect(client.router).toBeDefined();
		});
	});

	describe('integration', () => {
		it('should allow creating a complete server with procedures', () => {
			const server = initWRPC.createServer();

			const testRouter = server.router({
				hello: server.procedure.input(z.string()).query(async ({ input }) => `Hello, ${input}!`),

				update: server.procedure.input(z.object({ id: z.string(), data: z.any() })).mutation(async ({ input }) => ({
					success: true,
					id: input.id
				}))
			});

			expect(testRouter.hello).toBeDefined();
			expect(testRouter.update).toBeDefined();
			expect(testRouter.hello._def.type).toBe('query');
			expect(testRouter.update._def.type).toBe('mutation');
		});

		it('should allow creating a complete client with procedures', () => {
			const client = initWRPC.createClient();

			const clientRouter = client.router({
				onNotification: client.procedure.input(z.string()).mutation(async ({ input }) => {
					console.log('Notification:', input);
					return { received: true };
				}),

				getStatus: client.procedure.query(async () => ({ status: 'online' }))
			});

			expect(clientRouter.onNotification).toBeDefined();
			expect(clientRouter.getStatus).toBeDefined();
			expect(clientRouter.onNotification._def.type).toBe('mutation');
			expect(clientRouter.getStatus._def.type).toBe('query');
		});

		it('should support meta configuration with typed builders', () => {
			interface CustomMeta {
				requiresAuth: boolean;
				rateLimit?: number;
			}

			const metaBuilder = initWRPC.meta<CustomMeta>();
			const server = metaBuilder.createServer({
				defaultMeta: {
					requiresAuth: false
				}
			});

			const protectedProcedure = server.procedure
				.meta({ requiresAuth: true, rateLimit: 100 })
				.input(z.string())
				.query(async ({ input }) => `Protected: ${input}`);

			expect(protectedProcedure._def.meta).toEqual({
				requiresAuth: true,
				rateLimit: 100
			});
		});

		it('should allow merging routers created from the same root', () => {
			const server = initWRPC.createServer();

			const userRouter = server.router({
				getUser: server.procedure.input(z.string()).query(async ({ input }) => ({ id: input, name: 'Test User' }))
			});

			const postRouter = server.router({
				getPosts: server.procedure.query(async () => [{ id: '1', title: 'Test Post' }])
			});

			const mergedRouter = server.mergeRouters(userRouter, postRouter);

			expect(mergedRouter.getUser).toBeDefined();
			expect(mergedRouter.getPosts).toBeDefined();
		});
	});
});
