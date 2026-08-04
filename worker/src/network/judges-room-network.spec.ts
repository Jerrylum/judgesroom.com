import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestServerContext, seedTestDatabase } from '../test-utils';
import type { ServerContext } from '../server-router';
import { generateAuthToken, getJudgeAdvisorAuthToken } from '../access/tokens';
import { serverRouter } from '../server-router';
import type { Session } from '@judgesroom.com/wrpc/server/session';
import type { AnyRouter } from '@judgesroom.com/wrpc/server/router';
import { upsertJudge } from '../routes/judge';
import { getEssentialData } from '../routes/essential';
import { judges } from '../db/schema';

describe('JudgesRoomNetwork.authorizeConnect', () => {
	let context: ServerContext & { cleanup: () => void };
	const jaDeviceId = '550e8400-e29b-41d4-a716-4466554400aa';
	const judgeDeviceId = '550e8400-e29b-41d4-a716-4466554400bb';
	const judgeId = '550e8400-e29b-41d4-a716-4466554400dd';

	const session: Session<AnyRouter> = {
		getClient: () =>
			({
				onClientAuthenticationChange: { mutation: async () => undefined }
			}) as never,
		broadcast: () =>
			({
				onDeviceListUpdate: { mutation: async () => [] },
				onEventSetupUpdate: { mutation: async () => [] },
				onAllJudgesUpdate: { mutation: async () => [] },
				onSubmissionCacheUpdate: { mutation: async () => [] },
				onReviewedTeamsUpdate: { mutation: async () => [] }
			}) as never,
		getServer: () => {
			throw new Error('getServer() cannot be called from server-side session');
		},
		roomId: 'test-room',
		currentClient: {
			clientId: `${jaDeviceId}-client`,
			deviceId: jaDeviceId,
			deviceName: 'Test Device'
		}
	};

	beforeEach(async () => {
		context = createTestServerContext();
	});

	afterEach(async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		context.cleanup();
	});

	it('allows connect when room is empty (create path)', async () => {
		const result = await context.network.authorizeConnect(jaDeviceId, null);
		expect(result.allowed).toBe(true);
		if (result.allowed) {
			expect(result.authentication).toEqual({ isAccessControlled: false });
		}
	});

	it('allows connect when access control is off', async () => {
		await seedTestDatabase(context);
		const result = await context.network.authorizeConnect(jaDeviceId, null);
		expect(result.allowed).toBe(true);
		if (result.allowed) {
			expect(result.authentication).toEqual({ isAccessControlled: false });
		}
	});

	it('rejects missing or invalid auth when access control is on', async () => {
		await seedTestDatabase(context);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...(await getEssentialData(context.db)), accessControlEnabled: true },
			session,
			ctx: context
		});

		const missing = await context.network.authorizeConnect(jaDeviceId, null);
		expect(missing.allowed).toBe(false);
		if (!missing.allowed) {
			expect(missing.response.status).toBe(401);
		}

		const invalid = await context.network.authorizeConnect(jaDeviceId, 'notAValidTok');
		expect(invalid.allowed).toBe(false);

		const jaToken = await getJudgeAdvisorAuthToken(context.db);
		expect(jaToken).toBeTruthy();
		const ok = await context.network.authorizeConnect(jaDeviceId, jaToken);
		expect(ok.allowed).toBe(true);
		if (ok.allowed) {
			expect(ok.authentication).toEqual({
				isAccessControlled: true,
				authToken: jaToken,
				role: 'judge_advisor'
			});
		}
	});

	it('allows the same device to reconnect with the same credentials', async () => {
		await seedTestDatabase(context);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...(await getEssentialData(context.db)), accessControlEnabled: true },
			session,
			ctx: context
		});
		const jaToken = (await getJudgeAdvisorAuthToken(context.db))!;
		context.network.getAllClientAuthentications = () => [
			{
				clientId: `${jaDeviceId}-client`,
				deviceId: jaDeviceId,
				authentication: { isAccessControlled: true, authToken: jaToken, role: 'judge_advisor' }
			}
		];

		const ok = await context.network.authorizeConnect(jaDeviceId, jaToken);
		expect(ok.allowed).toBe(true);
	});

	it('rejects the same device reconnecting with different credentials', async () => {
		await seedTestDatabase(context);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...(await getEssentialData(context.db)), accessControlEnabled: true },
			session,
			ctx: context
		});
		await upsertJudge(context.db, { id: judgeId, name: 'Judge One', groupId: 'group-1' });
		const jaToken = (await getJudgeAdvisorAuthToken(context.db))!;
		const judgeToken = generateAuthToken();
		await context.db.update(judges).set({ authToken: judgeToken }).where(eq(judges.id, judgeId));

		context.network.getAllClientAuthentications = () => [
			{
				clientId: `${judgeDeviceId}-client`,
				deviceId: judgeDeviceId,
				authentication: { isAccessControlled: true, authToken: judgeToken, role: 'judge', judgeId }
			}
		];

		const denied = await context.network.authorizeConnect(judgeDeviceId, jaToken);
		expect(denied.allowed).toBe(false);
		if (!denied.allowed) {
			expect(denied.response.status).toBe(401);
			expect(await denied.response.text()).toMatch(/different credentials/i);
		}
	});
});
