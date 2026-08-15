import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestServerContext, seedTestDatabase } from '../test-utils';
import type { ServerContext } from '../server-router';
import { generateAuthToken, getJudgeAdvisorAuthToken } from '../access/tokens';
import { serverRouter } from '../server-router';
import type { AnyRouter, Session } from '@jerrylum/wrpc/server';
import { upsertJudge } from '../routes/judge';
import { getEssentialData } from '../routes/essential';
import { judges } from '../db/schema';
import {
	ConnectAuthCloseReason,
	MAX_CONNECTIONS_PER_ACCESS_LINK,
	type ClientAuthentication
} from '@judgesroom.com/protocol/src/access';
import {
	countAccessLinkConnections,
	sameAccessLinkIdentity,
	type ClientAuthenticationEntry
} from './judges-room-network';

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
				onDeviceListUpdate: { notify: () => {} },
				onEventSetupUpdate: { notify: () => {} },
				onAllJudgesUpdate: { notify: () => {} },
				onReassignTeams: { notify: () => {} },
				onSubmissionCacheUpdate: { notify: () => {} },
				onReviewedTeamsUpdate: { notify: () => {} }
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
			expect(missing.reason).toMatch(/access link required/i);
		}

		const invalid = await context.network.authorizeConnect(jaDeviceId, 'notAValidTok');
		expect(invalid.allowed).toBe(false);
		if (!invalid.allowed) {
			expect(invalid.reason).toMatch(/invalid or expired/i);
		}

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
			expect(denied.reason).toMatch(/different credentials/i);
		}
	});

	it('rejects a newcomer when the access link already has 100 connections', async () => {
		await seedTestDatabase(context);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...(await getEssentialData(context.db)), accessControlEnabled: true },
			session,
			ctx: context
		});
		await upsertJudge(context.db, { id: judgeId, name: 'Judge One', groupId: 'group-1' });
		const judgeToken = generateAuthToken();
		await context.db.update(judges).set({ authToken: judgeToken }).where(eq(judges.id, judgeId));
		const judgeAuth = {
			isAccessControlled: true as const,
			authToken: judgeToken,
			role: 'judge' as const,
			judgeId
		};
		context.network.getAllClientAuthentications = () => accessLinkEntries(MAX_CONNECTIONS_PER_ACCESS_LINK, judgeAuth);

		const denied = await context.network.authorizeConnect(judgeDeviceId, judgeToken);
		expect(denied.allowed).toBe(false);
		if (!denied.allowed) {
			expect(denied.reason).toBe(ConnectAuthCloseReason.TOO_MANY_CONNECTIONS);
		}
	});

	it('allows the 100th connection', async () => {
		await seedTestDatabase(context);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...(await getEssentialData(context.db)), accessControlEnabled: true },
			session,
			ctx: context
		});
		await upsertJudge(context.db, { id: judgeId, name: 'Judge One', groupId: 'group-1' });
		const judgeToken = generateAuthToken();
		await context.db.update(judges).set({ authToken: judgeToken }).where(eq(judges.id, judgeId));
		const judgeAuth = {
			isAccessControlled: true as const,
			authToken: judgeToken,
			role: 'judge' as const,
			judgeId
		};
		context.network.getAllClientAuthentications = () => accessLinkEntries(MAX_CONNECTIONS_PER_ACCESS_LINK - 1, judgeAuth);

		const hundredth = await context.network.authorizeConnect(judgeDeviceId, judgeToken);
		expect(hundredth.allowed).toBe(true);
	});

	it('does not count JA sockets against a judge link', async () => {
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
		context.network.getAllClientAuthentications = () =>
			accessLinkEntries(MAX_CONNECTIONS_PER_ACCESS_LINK, {
				isAccessControlled: true,
				authToken: jaToken,
				role: 'judge_advisor'
			});

		const ok = await context.network.authorizeConnect(judgeDeviceId, judgeToken);
		expect(ok.allowed).toBe(true);

		const jaStillAllowed = await context.network.authorizeConnect(jaDeviceId, jaToken);
		expect(jaStillAllowed.allowed).toBe(true);
	});

	it('is not running after destroy', async () => {
		expect(context.network.isRunning()).toBe(true);
		await context.network.destroy();
		expect(context.network.isRunning()).toBe(false);
	});
});

function accessLinkEntries(count: number, authentication: ClientAuthentication): ClientAuthenticationEntry[] {
	return Array.from({ length: count }, (_, i) => ({
		clientId: `client-${i}`,
		deviceId: `device-${i}`,
		authentication
	}));
}

describe('countAccessLinkConnections', () => {
	const judgeId = '550e8400-e29b-41d4-a716-4466554400dd';
	const otherJudgeId = '550e8400-e29b-41d4-a716-4466554400ee';
	const judgeAuth: ClientAuthentication = {
		isAccessControlled: true,
		authToken: 'abcdefghijkl',
		role: 'judge',
		judgeId
	};
	const otherJudgeAuth: ClientAuthentication = {
		isAccessControlled: true,
		authToken: 'mnopqrstuvwx',
		role: 'judge',
		judgeId: otherJudgeId
	};
	const jaAuth: ClientAuthentication = {
		isAccessControlled: true,
		authToken: 'JAToken_____',
		role: 'judge_advisor'
	};

	it('counts only the same judge identity', () => {
		const entries = [
			...accessLinkEntries(3, judgeAuth),
			...accessLinkEntries(2, otherJudgeAuth),
			...accessLinkEntries(4, jaAuth)
		];
		expect(countAccessLinkConnections(entries, judgeAuth)).toBe(3);
		expect(countAccessLinkConnections(entries, otherJudgeAuth)).toBe(2);
		expect(countAccessLinkConnections(entries, jaAuth)).toBe(0);
		expect(countAccessLinkConnections(entries, { isAccessControlled: false })).toBe(0);
	});

	it('matches judges by judgeId and ignores JA', () => {
		expect(sameAccessLinkIdentity(judgeAuth, jaAuth)).toBe(false);
		expect(sameAccessLinkIdentity(judgeAuth, otherJudgeAuth)).toBe(false);
		expect(sameAccessLinkIdentity(judgeAuth, judgeAuth)).toBe(true);
		expect(sameAccessLinkIdentity(jaAuth, jaAuth)).toBe(false);
	});
});
