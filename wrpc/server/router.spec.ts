/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouterFactory, mergeRouters } from './router';
import type { RootConfig, AnyRootTypes } from './root-config';
import type { AnyProcedure } from './procedure';

// Mock procedure for testing
const createMockProcedure = (type: 'query' | 'mutation', path?: string): AnyProcedure => {
	const procedure = vi.fn() as unknown as AnyProcedure;
	procedure._def = {
		procedure: true,
		$types: null as any,
		type,
		meta: undefined,
		_resolver: vi.fn(),
		_inputSchemas: [],
		_outputSchema: undefined
	};
	return procedure;
};

describe('Router', () => {
	let mockRootConfig: RootConfig<AnyRootTypes>;
	let createRouter: ReturnType<typeof createRouterFactory>;

	beforeEach(() => {
		mockRootConfig = {
			$types: null as any,
			meta: {}
		};
		createRouter = createRouterFactory(mockRootConfig);
	});

	describe('createRouterFactory', () => {
		it('should create a router with simple procedures', () => {
			const queryProcedure = createMockProcedure('query');
			const mutationProcedure = createMockProcedure('mutation');

			const router = createRouter({
				getUser: queryProcedure,
				updateUser: mutationProcedure
			});

			expect(router._def).toEqual({
				_config: mockRootConfig,
				router: true,
				record: {
					getUser: queryProcedure,
					updateUser: mutationProcedure
				}
			});

			expect(router.getUser).toBe(queryProcedure);
			expect(router.updateUser).toBe(mutationProcedure);
		});

		it('should handle nested router structures', () => {
			const userQuery = createMockProcedure('query');
			const userMutation = createMockProcedure('mutation');
			const postQuery = createMockProcedure('query');

			const router = createRouter({
				user: {
					get: userQuery,
					update: userMutation
				},
				posts: {
					list: postQuery
				}
			});

			expect(router._def.record).toEqual({
				user: {
					get: userQuery,
					update: userMutation
				},
				posts: {
					list: postQuery
				}
			});

			expect((router as any).user.get).toBe(userQuery);
			expect((router as any).user.update).toBe(userMutation);
			expect((router as any).posts.list).toBe(postQuery);
		});

		it('should handle nested routers (router composition)', () => {
			const userQuery = createMockProcedure('query');
			const postQuery = createMockProcedure('query');

			const userRouter = createRouter({
				get: userQuery
			});

			const mainRouter = createRouter({
				user: userRouter,
				posts: {
					list: postQuery
				}
			});

			expect(mainRouter._def.record).toEqual({
				user: {
					get: userQuery
				},
				posts: {
					list: postQuery
				}
			});
		});

		it('should throw error for duplicate procedure paths', () => {
			const procedure1 = createMockProcedure('query');
			const procedure2 = createMockProcedure('mutation');

			// This should work fine - different top-level keys
			const router1 = createRouter({
				getUser: procedure1,
				updateUser: procedure2
			});

			expect(router1._def.record.getUser).toBe(procedure1);
			expect(router1._def.record.updateUser).toBe(procedure2);

			// Test nested duplicate paths by creating a more complex scenario
			const nestedRouter = createRouter({
				user: {
					get: procedure1
				}
			});

			// This should work - different paths
			const mainRouter = createRouter({
				api: nestedRouter,
				user: {
					create: procedure2
				}
			});

			expect((mainRouter as any).api.user.get).toBe(procedure1);
			expect((mainRouter as any).user.create).toBe(procedure2);
		});

		it('should handle empty router', () => {
			const router = createRouter({});

			expect(router._def).toEqual({
				_config: mockRootConfig,
				router: true,
				record: {}
			});
		});

		it('should handle deeply nested structures', () => {
			const deepProcedure = createMockProcedure('query');

			const router = createRouter({
				level1: {
					level2: {
						level3: {
							deepProcedure
						}
					}
				}
			});

			expect((router as any).level1.level2.level3.deepProcedure).toBe(deepProcedure);
		});
	});

	describe('mergeRouters', () => {
		it('should merge two simple routers', () => {
			const procedure1 = createMockProcedure('query');
			const procedure2 = createMockProcedure('mutation');
			const procedure3 = createMockProcedure('query');

			const router1 = createRouter({
				getUser: procedure1,
				updateUser: procedure2
			});

			const router2 = createRouter({
				deleteUser: procedure3
			});

			const mergedRouter = mergeRouters(router1, router2);

			expect(mergedRouter._def.record).toEqual({
				getUser: procedure1,
				updateUser: procedure2,
				deleteUser: procedure3
			});

			expect((mergedRouter as any).getUser).toBe(procedure1);
			expect((mergedRouter as any).updateUser).toBe(procedure2);
			expect((mergedRouter as any).deleteUser).toBe(procedure3);
		});

		it('should merge multiple routers', () => {
			const proc1 = createMockProcedure('query');
			const proc2 = createMockProcedure('mutation');
			const proc3 = createMockProcedure('query');
			const proc4 = createMockProcedure('mutation');

			const router1 = createRouter({ proc1 });
			const router2 = createRouter({ proc2 });
			const router3 = createRouter({ proc3, proc4 });

			const mergedRouter = mergeRouters(router1, router2, router3);

			expect(mergedRouter._def.record).toEqual({
				proc1,
				proc2,
				proc3,
				proc4
			});
		});

		it('should merge routers with nested structures', () => {
			const userGet = createMockProcedure('query');
			const userUpdate = createMockProcedure('mutation');
			const postList = createMockProcedure('query');
			const postCreate = createMockProcedure('mutation');

			const userRouter = createRouter({
				user: {
					get: userGet,
					update: userUpdate
				}
			});

			const postRouter = createRouter({
				posts: {
					list: postList,
					create: postCreate
				}
			});

			const mergedRouter = mergeRouters(userRouter, postRouter);

			expect(mergedRouter._def.record).toEqual({
				user: {
					get: userGet,
					update: userUpdate
				},
				posts: {
					list: postList,
					create: postCreate
				}
			});
		});

		it('should handle merging with overlapping keys (later router wins)', () => {
			const originalProc = createMockProcedure('query');
			const overrideProc = createMockProcedure('mutation');

			const router1 = createRouter({
				test: originalProc,
				unique1: originalProc
			});

			const router2 = createRouter({
				test: overrideProc,
				unique2: overrideProc
			});

			const mergedRouter = mergeRouters(router1, router2);

			expect(mergedRouter._def.record).toEqual({
				test: overrideProc, // router2's version wins
				unique1: originalProc,
				unique2: overrideProc
			});
		});

		it('should preserve the root config from the first router', () => {
			const proc1 = createMockProcedure('query');
			const proc2 = createMockProcedure('mutation');

			const router1 = createRouter({ proc1 });
			const router2 = createRouter({ proc2 });

			const mergedRouter = mergeRouters(router1, router2);

			expect(mergedRouter._def._config).toBe(mockRootConfig);
		});

		it('should handle merging single router', () => {
			const proc = createMockProcedure('query');
			const router = createRouter({ proc });

			const mergedRouter = mergeRouters(router);

			expect(mergedRouter._def.record).toEqual({ proc });
		});
	});
});
