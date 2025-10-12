import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { serverRouter } from './server-router';
import { createTestServerContext, seedTestDatabase, sampleTeamInfoAndData } from './test-utils';
import { getAwards, getTeamInfos, getEssentialData } from './routes/essential';
import { getTeamData } from './routes/team';
import { getJudges } from './routes/judge';
import type { ServerContext } from './server-router';
import type { Session } from '@judging.jerryio/wrpc/server/session';
import type { AnyRouter } from '@judging.jerryio/wrpc/server/router';

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
					onAllJudgesUpdate: { mutation: async () => [] }
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

		it('createJudgesRoom returns already exists when metadata present', async () => {
			const resolver = serverRouter.handshake.createJudgesRoom._def._resolver!;
			const starter = await serverRouter.handshake.joinJudgesRoom._def._resolver!({ input: undefined, session, ctx: context });
			const result = await resolver({ input: starter, session, ctx: context });
			expect(result.success).toBe(false);
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
		it('get, upsert, remove judge', async () => {
			const getResolver = serverRouter.judge.getJudges._def._resolver!;
			const updateResolver = serverRouter.judge.updateJudge._def._resolver!;
			const removeResolver = serverRouter.judge.removeJudge._def._resolver!;
			const initial = await getResolver({ input: undefined, session, ctx: context });
			const newJudge = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'New Judge', groupId: 'group-1' };
			await updateResolver({ input: newJudge, session, ctx: context });
			const withNew = await getJudges(context.db);
			expect(withNew.some((j) => j.id === newJudge.id)).toBe(true);
			await removeResolver({ input: newJudge, session, ctx: context });
			const afterRemove = await getJudges(context.db);
			expect(afterRemove.length).toBe(initial.length);
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
	});

	// describe('judging router', () => {

	// });
});
