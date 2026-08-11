import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { serverRouter } from './server-router';
import { createTestServerContext, seedTestDatabase, sampleTeamInfoAndData } from './test-utils';
import { getAwards, getTeamInfos, getEssentialData } from './routes/essential';
import { getTeamData } from './routes/team';
import { getJudges } from './routes/judge';
import { Authentication } from './access/authentication';
import type { ServerContext } from './server-router';
import type { AnyRouter, Session } from '@jerrylum/wrpc/server';

describe('ServerRouter', () => {
	let context: ServerContext & { cleanup: () => void };
	let session: Session<AnyRouter>;

	beforeEach(async () => {
		context = createTestServerContext();
		await seedTestDatabase(context);

		// Minimal session with broadcast handlers used by routes
		session = {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			getClient: () => ({}) as any,
			broadcast: () =>
				({
					onDeviceListUpdate: { mutation: async () => [] },
					onEventSetupUpdate: { mutation: async () => [] },
					onAllTeamDataUpdate: { mutation: async () => [] },
					onTeamDataUpdate: { mutation: async () => [] },
					onAllJudgesUpdate: { mutation: async () => [] },
					onReassignTeams: { mutation: async () => [] }
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				}) as any,
			getServer: () => {
				throw new Error('getServer() cannot be called from server-side session');
			},
			roomId: 'test-room',
			currentClient: {
				clientId: 'test-client',
				deviceId: 'test-device',
				deviceName: 'Test Device'
			}
		};
	});

	afterEach(async () => {
		// Allow any pending async operations to complete before cleanup
		// This prevents database connection errors in broadcast operations
		await new Promise((resolve) => setTimeout(resolve, 10));
		context.cleanup();
	});

	describe('essential helpers', () => {
		it('getAwards: all and by type', async () => {
			const all = await getAwards(context.db);
			expect(all).toHaveLength(4);
			const perf = await getAwards(context.db, 'performance');
			expect(perf).toHaveLength(1);
		});

		it('getTeamInfos: all and by group', async () => {
			const all = await getTeamInfos(context.db);
			expect(all).toHaveLength(4);
			const groupA = await getTeamInfos(context.db, 'Group A');
			expect(groupA).toHaveLength(2);
		});

		it('getEssentialData returns full dataset', async () => {
			const data = await getEssentialData(context.db);
			expect(data.eventName).toBe('Test Event');
			expect(data.awards.length).toBeGreaterThan(0);
			expect(data.teamInfos.length).toBeGreaterThan(0);
			expect(data.judgeGroups.length).toBeGreaterThan(0);
		});
	});

	describe('handshake router', () => {
		it('joinJudgesRoom returns starter kit', async () => {
			const resolver = serverRouter.handshake.joinJudgesRoom._def._resolver!;
			const result = await resolver({ input: undefined, session, ctx: context });
			expect(result.essentialData.eventName).toBe('Test Event');
			expect(Array.isArray(result.teamData)).toBe(true);
			expect(Array.isArray(result.judges)).toBe(true);
		});

		it('createJudgesRoom rejects when metadata present', async () => {
			const resolver = serverRouter.handshake.createJudgesRoom._def._resolver!;
			context.auth = Authentication.withFixture();
			await expect(
				resolver({
					input: {
						essentialData: await getEssentialData(context.db),
						teamData: [],
						judges: []
					},
					session,
					ctx: context
				})
			).rejects.toThrow(/already exists/);
		});

		it('destroyJudgesRoom returns success', async () => {
			const resolver = serverRouter.handshake.destroyJudgesRoom._def._resolver!;
			const result = await resolver({ input: undefined, session, ctx: context });
			expect(result.success).toBe(true);
		});
	});

	describe('essential.updateEssentialData', () => {
		it('updates metadata and collections', async () => {
			const current = await getEssentialData(context.db);
			const input = {
				...current,
				eventName: 'Updated Event Name',
				awards: current.awards.slice(0, 2),
				teamInfos: current.teamInfos.slice(0, 2),
				judgeGroups: current.judgeGroups.slice(0, 1)
			};
			const resolver = serverRouter.essential.updateEssentialData._def._resolver!;
			await resolver({ input, session, ctx: context });
			const updated = await getEssentialData(context.db);
			expect(updated.eventName).toBe('Updated Event Name');
			expect(updated.awards).toHaveLength(2);
			expect(updated.teamInfos).toHaveLength(2);
			expect(updated.judgeGroups).toHaveLength(1);
		});

		it('updates metadata and collections with empty arrays', async () => {
			const current = await getEssentialData(context.db);
			const input = {
				...current,
				eventName: 'Updated Event Name',
				awards: []
			};
			const resolver = serverRouter.essential.updateEssentialData._def._resolver!;
			await resolver({ input, session, ctx: context });
			const updated = await getEssentialData(context.db);
			expect(updated.eventName).toBe('Updated Event Name');
			expect(updated.awards).toHaveLength(0);
			expect(updated.teamInfos).toHaveLength(4);
			expect(updated.judgeGroups).toHaveLength(1);
		});
	});

	describe('team router', () => {
		it('getTeamData and updateTeamData', async () => {
			const getResolver = serverRouter.team.getTeamData._def._resolver!;
			const updateResolver = serverRouter.team.updateTeamData._def._resolver!;
			const before = await getResolver({ input: undefined, session, ctx: context });
			expect(before).toHaveLength(4);
			const team = before[0];
			await updateResolver({ input: { ...team, absent: true }, session, ctx: context });
			const after = await getTeamData(context.db);
			expect(after.find((t) => t.id === team.id)?.absent).toBe(true);
		});
	});

	describe('judge router', () => {
		it('get, upsert, remove judge via updateAllJudges', async () => {
			const getResolver = serverRouter.judge.getJudges._def._resolver!;
			const updateResolver = serverRouter.judge.updateJudge._def._resolver!;
			const updateAllResolver = serverRouter.judge.updateAllJudges._def._resolver!;
			const initial = await getResolver({ input: undefined, session, ctx: context });
			const newJudge = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'New Judge', groupId: 'group-1' };
			await updateResolver({ input: newJudge, session, ctx: context });
			const withNew = await getJudges(context.db);
			expect(withNew.some((j) => j.id === newJudge.id)).toBe(true);
			await updateAllResolver({ input: initial, session, ctx: context });
			const afterRemove = await getJudges(context.db);
			expect(afterRemove.length).toBe(initial.length);
			expect(afterRemove.some((j) => j.id === newJudge.id)).toBe(false);
		});

		it('removeJudge', async () => {
			const judgeId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

			await serverRouter.judge.updateJudge._def._resolver!({
				input: { id: judgeId, name: 'Removable Judge', groupId: 'group-1' },
				session,
				ctx: context
			});

			await serverRouter.judge.removeJudge._def._resolver!({
				input: { judgeId },
				session,
				ctx: context
			});
			const after = await getJudges(context.db);
			expect(after.some((j) => j.id === judgeId)).toBe(false);
		});
	});

	describe('essential.reassignTeam', () => {
		it('moves a team and its submission caches to another judge group', async () => {
			const {
				judgeGroups,
				judgeGroupsAssignedTeams,
				judgeGroupsSubmissionsCache,
				judges,
				engineeringNotebookRubrics
			} = await import('./db/schema');
			const groupA = '11111111-1111-4111-8111-111111111111';
			const groupB = '22222222-2222-4222-8222-222222222222';
			const judgeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
			const teamId = sampleTeamInfoAndData[0].id;
			const enrId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

			await context.db.insert(judgeGroups).values([
				{ id: groupA, name: 'Alpha' },
				{ id: groupB, name: 'Beta' }
			]);
			await context.db.insert(judges).values({
				id: judgeId,
				name: 'Judge',
				groupId: groupA,
				authToken: 'test-token-reassign-cache'
			});
			await context.db.insert(judgeGroupsAssignedTeams).values({
				order: 0,
				judgeGroupId: groupA,
				teamId
			});
			await context.db.insert(engineeringNotebookRubrics).values({
				id: enrId,
				teamId,
				judgeId,
				rubric: {},
				notes: '',
				innovateAwardNotes: '',
				timestamp: Date.now()
			});
			await context.db.insert(judgeGroupsSubmissionsCache).values({
				judgeGroupId: groupA,
				teamId,
				judgeId,
				timestamp: Date.now(),
				enrId,
				tiId: null,
				tnId: null,
				score: 10
			});

			await serverRouter.essential.reassignTeam._def._resolver!({
				input: { teamId, toJudgeGroupId: groupB },
				session,
				ctx: context
			});

			const essential = await getEssentialData(context.db);
			const alpha = essential.judgeGroups.find((g) => g.id === groupA);
			const beta = essential.judgeGroups.find((g) => g.id === groupB);
			expect(alpha?.assignedTeams).not.toContain(teamId);
			expect(beta?.assignedTeams).toContain(teamId);

			const caches = await context.db.select().from(judgeGroupsSubmissionsCache).where(eq(judgeGroupsSubmissionsCache.teamId, teamId));
			expect(caches).toHaveLength(1);
			expect(caches[0]?.judgeGroupId).toBe(groupB);
		});

	});

	// describe('client router', () => {
	// 	it('getClients and kickClient (offline)', async () => {
	// 		// Ensure there is at least one offline client by joining Judges' Room
	// 		await serverRouter.handshake.joinJudgesRoom._def._resolver!({ input: undefined, session, ctx: context });
	// 		const getResolver = serverRouter.client.getClients._def._resolver!;
	// 		const clients = await getResolver({ input: undefined, session, ctx: context });
	// 		expect(clients.length).toBeGreaterThan(0);
	// 		const kickResolver = serverRouter.client.kickClient._def._resolver!;
	// 		const result = await kickResolver({ input: { clientId: clients[0].clientId }, session, ctx: context });
	// 		expect(result.success).toBe(false);
	// 	});
	// });
	describe('device router', () => {
		it('getDevices and kickDevice (offline)', async () => {
			// Ensure there is at least one offline device by joining Judges' Room
			await serverRouter.handshake.joinJudgesRoom._def._resolver!({ input: undefined, session, ctx: context });
			const getResolver = serverRouter.device.getDevices._def._resolver!;
			const devices = await getResolver({ input: undefined, session, ctx: context });
			expect(devices.length).toBeGreaterThan(0);
		});

		it('leaveJudgesRoom removes the current device from the device list', async () => {
			await serverRouter.handshake.joinJudgesRoom._def._resolver!({ input: undefined, session, ctx: context });
			const before = await serverRouter.device.getDevices._def._resolver!({ input: undefined, session, ctx: context });
			expect(before.some((d) => d.deviceId === session.currentClient.deviceId)).toBe(true);

			await serverRouter.handshake.leaveJudgesRoom._def._resolver!({ input: undefined, session, ctx: context });

			const after = await serverRouter.device.getDevices._def._resolver!({ input: undefined, session, ctx: context });
			expect(after.some((d) => d.deviceId === session.currentClient.deviceId)).toBe(false);
		});
	});

	// describe('judging router', () => {

	// });
});
