import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServerContext, seedTestDatabase } from '../test-utils';
import type { ServerContext } from '../server-router';
import { getJudgeAdvisorAuthToken } from '../access/tokens';
import { serverRouter } from '../server-router';
import type { Session } from '@judgesroom.com/wrpc/server/session';
import type { AnyRouter } from '@judgesroom.com/wrpc/server/router';

describe('JudgesRoomNetwork.authorizeConnect', () => {
	let context: ServerContext & { cleanup: () => void };
	const jaDeviceId = '550e8400-e29b-41d4-a716-4466554400aa';

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

	afterEach(() => {
		context.cleanup();
	});

	it('allows connect when room is empty (create path)', async () => {
		const result = await context.network.authorizeConnect(null);
		expect(result.allowed).toBe(true);
		if (result.allowed) {
			expect(result.authentication).toEqual({ isAccessControlled: false });
		}
	});

	it('allows connect when access control is off', async () => {
		await seedTestDatabase(context);
		const result = await context.network.authorizeConnect(null);
		expect(result.allowed).toBe(true);
		if (result.allowed) {
			expect(result.authentication).toEqual({ isAccessControlled: false });
		}
	});

	it('rejects missing or invalid auth when access control is on', async () => {
		await seedTestDatabase(context);
		const essential = await serverRouter.essential.updateEssentialData._def._resolver!;
		const { getEssentialData } = await import('../routes/essential');
		await essential({
			input: { ...(await getEssentialData(context.db)), accessControlEnabled: true },
			session,
			ctx: context
		});

		const missing = await context.network.authorizeConnect(null);
		expect(missing.allowed).toBe(false);
		if (!missing.allowed) {
			expect(missing.response.status).toBe(401);
		}

		const invalid = await context.network.authorizeConnect('notAValidTok');
		expect(invalid.allowed).toBe(false);

		const jaToken = await getJudgeAdvisorAuthToken(context.db);
		expect(jaToken).toBeTruthy();
		const ok = await context.network.authorizeConnect(jaToken);
		expect(ok.allowed).toBe(true);
		if (ok.allowed) {
			expect(ok.authentication).toEqual({
				isAccessControlled: true,
				authToken: jaToken,
				role: 'judge_advisor'
			});
		}
	});
});
