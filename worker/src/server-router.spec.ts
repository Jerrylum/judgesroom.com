import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { serverRouter } from './server-router';
import { createTestServerContext, seedTestDatabase, sampleAwards, sampleTeamInfoAndData } from './test-utils';
import type { ServerContext } from './server-router';
import type { Session } from '@judging.jerryio/wrpc/server/session';
import type { AnyRouter } from '@judging.jerryio/wrpc/server/router';
import type { Network } from '@judging.jerryio/wrpc/server/types';

describe('ServerRouter', () => {
	let context: ServerContext & { cleanup: () => void };
	let mockNetwork: Network;
	let session: Session<AnyRouter>;

	beforeEach(async () => {
		// Create a fresh test database for each test
		context = createTestServerContext();
		await seedTestDatabase(context);

		// Create mock network and session for procedure calls
		mockNetwork = {
			sendToClient: async () => ({ kind: 'response', id: 'test', result: { type: 'data', data: null } }),
			broadcast: async () => [],
			getConnectedClients: () => [],
			isClientConnected: () => false
		};

		// Create a mock session that matches the Session<AnyRouter> interface
		session = {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			getClient: () => ({}) as any,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			broadcast: () => ({}) as any,
			getServer: () => {
				throw new Error('getServer() cannot be called from server-side session');
			},
			sessionId: 'test-session',
			currentClient: {
				clientId: 'test-client',
				deviceName: 'Test Device'
			}
		};
	});

	afterEach(() => {
		// Clean up the database connection
		context.cleanup();
	});

	describe('getAwards', () => {
		it('should return all awards when no type filter is provided', async () => {
			// Call the procedure resolver directly
			const resolver = serverRouter.getAwards._def._resolver!;
			const result = await resolver({ input: {}, session, ctx: context });

			expect(result).toHaveLength(4);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'Excellence Award',
						type: 'performance',
						winnersCount: 1,
						requireNotebook: true
					}),
					expect.objectContaining({
						name: 'Design Award',
						type: 'judged',
						winnersCount: 3,
						requireNotebook: true
					}),
					expect.objectContaining({
						name: 'Teamwork Award',
						type: 'judged',
						winnersCount: 2,
						requireNotebook: false
					}),
					expect.objectContaining({
						name: 'Volunteer Award',
						type: 'volunteer_nominated',
						winnersCount: 1,
						requireNotebook: false
					})
				])
			);

			// Verify acceptedGrades are returned as an array (automatically deserialized from JSON)
			const excellenceAward = result.find((award) => award.name === 'Excellence Award');
			expect(excellenceAward?.acceptedGrades).toEqual(['High School', 'Middle School']);
		});

		it('should return only performance awards when type filter is "performance"', async () => {
			const resolver = serverRouter.getAwards._def._resolver!;
			const result = await resolver({ input: { type: 'performance' }, session, ctx: context });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					name: 'Excellence Award',
					type: 'performance',
					winnersCount: 1,
					requireNotebook: true
				})
			);
		});

		it('should return only judged awards when type filter is "judged"', async () => {
			const resolver = serverRouter.getAwards._def._resolver!;
			const result = await resolver({ input: { type: 'judged' }, session, ctx: context });

			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'Design Award',
						type: 'judged'
					}),
					expect.objectContaining({
						name: 'Teamwork Award',
						type: 'judged'
					})
				])
			);
		});

		it('should return only volunteer nominated awards when type filter is "volunteer_nominated"', async () => {
			const resolver = serverRouter.getAwards._def._resolver!;
			const result = await resolver({ input: { type: 'volunteer_nominated' }, session, ctx: context });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					name: 'Volunteer Award',
					type: 'volunteer_nominated',
					winnersCount: 1,
					requireNotebook: false
				})
			);
		});

		it('should return empty array when no awards match the filter', async () => {
			// Create a context with no data
			const emptyContext = createTestServerContext();
			const resolver = serverRouter.getAwards._def._resolver!;

			const result = await resolver({ input: { type: 'performance' }, session, ctx: emptyContext });

			expect(result).toHaveLength(0);
			emptyContext.cleanup();
		});

		it('should handle empty input object', async () => {
			const resolver = serverRouter.getAwards._def._resolver!;
			const result = await resolver({ input: {}, session, ctx: context });

			expect(result).toHaveLength(4);
		});

		it('should validate input type correctly', async () => {
			const resolver = serverRouter.getAwards._def._resolver!;

			// This should work with valid enum values
			await expect(resolver({ input: { type: 'performance' }, session, ctx: context })).resolves.toBeDefined();
			await expect(resolver({ input: { type: 'judged' }, session, ctx: context })).resolves.toBeDefined();
			await expect(resolver({ input: { type: 'volunteer_nominated' }, session, ctx: context })).resolves.toBeDefined();
		});
	});

	describe('getTeamInfo', () => {
		it('should return all team info when no group filter is provided', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: {}, session, ctx: context });

			expect(result).toHaveLength(4);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: '550e8400-e29b-41d4-a716-446655440001',
						number: '123A',
						name: 'Robotics Team Alpha',
						group: 'Group A'
					}),
					expect.objectContaining({
						id: '550e8400-e29b-41d4-a716-446655440002',
						number: '456B',
						name: 'Engineering Eagles',
						group: 'Group B'
					}),
					expect.objectContaining({
						id: '550e8400-e29b-41d4-a716-446655440003',
						number: '789C',
						name: 'Code Crushers',
						group: 'Group A'
					}),
					expect.objectContaining({
						id: '550e8400-e29b-41d4-a716-446655440004',
						number: '101D',
						name: 'Binary Builders',
						group: 'Group C'
					})
				])
			);
		});

		it('should return only teams from Group A when group filter is "Group A"', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: { group: 'Group A' }, session, ctx: context });

			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						number: '123A',
						name: 'Robotics Team Alpha',
						group: 'Group A'
					}),
					expect.objectContaining({
						number: '789C',
						name: 'Code Crushers',
						group: 'Group A'
					})
				])
			);
		});

		it('should return only teams from Group B when group filter is "Group B"', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: { group: 'Group B' }, session, ctx: context });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					number: '456B',
					name: 'Engineering Eagles',
					group: 'Group B',
					grade: 'Middle School'
				})
			);
		});

		it('should return only teams from Group C when group filter is "Group C"', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: { group: 'Group C' }, session, ctx: context });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					number: '101D',
					name: 'Binary Builders',
					group: 'Group C',
					grade: 'Middle School'
				})
			);
		});

		it('should return empty array when no teams match the group filter', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: { group: 'Nonexistent Group' }, session, ctx: context });

			expect(result).toHaveLength(0);
		});

		it('should return empty array when database has no teams', async () => {
			// Create a context with no data
			const emptyContext = createTestServerContext();
			const resolver = serverRouter.getTeamInfo._def._resolver!;

			const result = await resolver({ input: { group: 'Group A' }, session, ctx: emptyContext });

			expect(result).toHaveLength(0);
			emptyContext.cleanup();
		});

		it('should handle empty input object', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: {}, session, ctx: context });

			expect(result).toHaveLength(4);
		});

		it('should return complete team information with all fields', async () => {
			const resolver = serverRouter.getTeamInfo._def._resolver!;
			const result = await resolver({ input: { group: 'Group A' }, session, ctx: context });

			const team = result.find((t: { number: string }) => t.number === '123A');
			expect(team).toEqual({
				id: '550e8400-e29b-41d4-a716-446655440001',
				number: '123A',
				name: 'Robotics Team Alpha',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				shortName: 'Alpha',
				school: 'Tech High School',
				grade: 'High School',
				group: 'Group A'
			});
		});
	});

	describe('Database Integration', () => {
		it('should handle database operations correctly', async () => {
			const awardsResolver = serverRouter.getAwards._def._resolver!;
			const teamsResolver = serverRouter.getTeamInfo._def._resolver!;

			// Test that both procedures can be called on the same context
			const awards = await awardsResolver({ input: {}, session, ctx: context });
			const teams = await teamsResolver({ input: {}, session, ctx: context });

			expect(awards).toHaveLength(4);
			expect(teams).toHaveLength(4);
		});

		it('should handle concurrent queries', async () => {
			const awardsResolver = serverRouter.getAwards._def._resolver!;
			const teamsResolver = serverRouter.getTeamInfo._def._resolver!;

			// Execute multiple queries concurrently
			const [allAwards, performanceAwards, allTeams, groupATeams] = await Promise.all([
				awardsResolver({ input: {}, session, ctx: context }),
				awardsResolver({ input: { type: 'performance' }, session, ctx: context }),
				teamsResolver({ input: {}, session, ctx: context }),
				teamsResolver({ input: { group: 'Group A' }, session, ctx: context })
			]);

			expect(allAwards).toHaveLength(4);
			expect(performanceAwards).toHaveLength(1);
			expect(allTeams).toHaveLength(4);
			expect(groupATeams).toHaveLength(2);
		});
	});
});
