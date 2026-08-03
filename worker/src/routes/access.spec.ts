import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { serverRouter } from '../server-router';
import { createTestServerContext, seedTestDatabase, sampleTeamInfoAndData } from '../test-utils';
import type { ServerContext } from '../server-router';
import type { Session } from '@judgesroom.com/wrpc/server/session';
import type { AnyRouter } from '@judgesroom.com/wrpc/server/router';
import { judges, metadata } from '../db/schema';
import { getEssentialData } from './essential';
import { upsertJudge } from './judge';
import { generateAuthToken, getJudgeAdvisorAuthToken, resolveClientAuthentication } from '../access/tokens';
import { Authentication } from '../access/authentication';
import { createEmptyNotebookRubricScores } from '@judgesroom.com/protocol/src/rubric';
import { uuidv4 } from '@judgesroom.com/protocol/src/utils';

describe('access control', () => {
	let context: ServerContext & { cleanup: () => void };
	let jaSession: Session<AnyRouter>;
	let judgeSession: Session<AnyRouter>;
	let otherSession: Session<AnyRouter>;

	const jaDeviceId = '550e8400-e29b-41d4-a716-4466554400aa';
	const judgeDeviceId = '550e8400-e29b-41d4-a716-4466554400bb';
	const otherDeviceId = '550e8400-e29b-41d4-a716-4466554400cc';
	const judgeId = '550e8400-e29b-41d4-a716-4466554400dd';
	const groupId = 'group-1';

	function makeSession(deviceId: string): Session<AnyRouter> {
		return {
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
				clientId: `${deviceId}-client`,
				deviceId,
				deviceName: 'Test Device'
			}
		};
	}

	async function ctxWithAuth(auth: string | null): Promise<ServerContext> {
		if (!auth) {
			return { ...context, auth: Authentication.withFixture() };
		}
		const authentication = await resolveClientAuthentication(context.db, auth);
		return {
			...context,
			auth: Authentication.withFixture(authentication ?? { isAccessControlled: false })
		};
	}

	async function enableAccessControl() {
		const essential = await getEssentialData(context.db);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...essential, accessControlEnabled: true },
			session: jaSession,
			ctx: context
		});
		expect(context.auth.isAuthenticatedJudgeAdvisor()).toBe(true);

		await upsertJudge(context.db, { id: judgeId, name: 'Judge One', groupId });
		const links = await serverRouter.access.listAccessLinks._def._resolver!({
			input: undefined,
			session: jaSession,
			ctx: context
		});
		return links;
	}

	beforeEach(async () => {
		context = createTestServerContext();
		await seedTestDatabase(context);
		jaSession = makeSession(jaDeviceId);
		judgeSession = makeSession(judgeDeviceId);
		otherSession = makeSession(otherDeviceId);
	});

	afterEach(async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		context.cleanup();
	});

	it('allows open join without auth when access control is off', async () => {
		const result = await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: otherSession,
			ctx: context
		});
		expect(result.essentialData.accessControlEnabled).toBe(false);
		expect(result.authentication).toEqual({ isAccessControlled: false });
	});

	it('rejects connect without auth when access control is on', async () => {
		await enableAccessControl();
		const denied = await context.network.authorizeConnect(null);
		expect(denied.allowed).toBe(false);
		if (!denied.allowed) {
			expect(denied.response.status).toBe(401);
		}

		// Join itself trusts fetch gating; unauthenticated context yields uncontrolled auth.
		const joined = await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: otherSession,
			ctx: await ctxWithAuth(null)
		});
		expect(joined.authentication).toEqual({ isAccessControlled: false });
	});

	it('binds judge device from connection authentication', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)?.authToken;
		expect(judgeToken).toBeTruthy();

		const result = await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(judgeToken!)
		});
		expect(result.authentication).toMatchObject({ isAccessControlled: true, role: 'judge', judgeId });
	});

	it('forbids kick and destroy for non-JA when access control is on', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges[0]!.authToken;
		const judgeCtx = await ctxWithAuth(judgeToken);
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: judgeCtx
		});

		await expect(
			serverRouter.device.kickDevice._def._resolver!({
				input: { deviceId: jaDeviceId },
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(/Judge Advisor/);

		await expect(
			serverRouter.handshake.destroyJudgesRoom._def._resolver!({
				input: undefined,
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(/Judge Advisor/);
	});

	it('rejects spoofed JA deviceId without connection auth', async () => {
		await enableAccessControl();
		const spoofSession = makeSession(jaDeviceId);
		const unauthCtx = await ctxWithAuth(null);

		await expect(
			serverRouter.device.kickDevice._def._resolver!({
				input: { deviceId: otherDeviceId },
				session: spoofSession,
				ctx: unauthCtx
			})
		).rejects.toThrow(/Judge Advisor/);

		await expect(
			serverRouter.access.listAccessLinks._def._resolver!({
				input: undefined,
				session: spoofSession,
				ctx: unauthCtx
			})
		).rejects.toThrow(/Judge Advisor/);

		await expect(
			serverRouter.handshake.destroyJudgesRoom._def._resolver!({
				input: undefined,
				session: spoofSession,
				ctx: unauthCtx
			})
		).rejects.toThrow(/Judge Advisor/);
	});

	it('allows JA ops from connection authentication regardless of deviceId', async () => {
		const links = await enableAccessControl();
		const spoofSession = makeSession(otherDeviceId);
		const jaCtx = await ctxWithAuth(links.judgeAdvisorAuthToken);

		const listed = await serverRouter.access.listAccessLinks._def._resolver!({
			input: undefined,
			session: spoofSession,
			ctx: jaCtx
		});
		expect(listed.judgeAdvisorAuthToken).toBe(links.judgeAdvisorAuthToken);

		await expect(
			serverRouter.device.kickDevice._def._resolver!({
				input: { deviceId: judgeDeviceId },
				session: spoofSession,
				ctx: jaCtx
			})
		).resolves.toBeUndefined();
	});

	it('rotates judge token and invalidates old link', async () => {
		const links = await enableAccessControl();
		const oldToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		let kicked = false;
		context.network.kickClientsWhere = async () => {
			kicked = true;
		};

		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(oldToken)
		});

		const rotated = await serverRouter.access.rotateJudgeAuth._def._resolver!({
			input: { judgeId },
			session: jaSession,
			ctx: context
		});
		expect(rotated.authToken).not.toBe(oldToken);
		expect(kicked).toBe(true);

		const denied = await context.network.authorizeConnect(oldToken);
		expect(denied.allowed).toBe(false);

		const ok = await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: otherSession,
			ctx: await ctxWithAuth(rotated.authToken)
		});
		expect(ok.authentication).toMatchObject({ isAccessControlled: true, role: 'judge', judgeId });
	});

	it('rotates JA token and keeps current JA device', async () => {
		const links = await enableAccessControl();
		const oldJaToken = links.judgeAdvisorAuthToken;
		let kicked = false;
		context.network.kickClientsWhere = async () => {
			kicked = true;
		};

		const rotated = await serverRouter.access.rotateJudgeAdvisorAuth._def._resolver!({
			input: undefined,
			session: jaSession,
			ctx: context
		});
		expect(rotated.authToken).not.toBe(oldJaToken);
		expect(kicked).toBe(true);
		expect(context.auth.authToken).toBe(rotated.authToken);
		expect(await getJudgeAdvisorAuthToken(context.db)).toBe(rotated.authToken);

		const denied = await context.network.authorizeConnect(oldJaToken);
		expect(denied.allowed).toBe(false);
	});

	it('closes sockets for deleted judge auth token', async () => {
		const links = await enableAccessControl();
		const oldToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		let kicked = false;
		context.network.kickClientsWhere = async () => {
			kicked = true;
		};

		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(oldToken)
		});

		await serverRouter.judge.updateAllJudges._def._resolver!({
			input: [],
			session: jaSession,
			ctx: context
		});

		expect(kicked).toBe(true);
		const remaining = await context.db.select().from(judges).where(eq(judges.id, judgeId));
		expect(remaining).toHaveLength(0);
	});

	it('rejects rubric completion with another judgeId under access control', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		const judgeCtx = await ctxWithAuth(judgeToken);
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: judgeCtx
		});

		const otherJudgeId = uuidv4();
		await upsertJudge(context.db, { id: otherJudgeId, name: 'Other', groupId });

		await expect(
			serverRouter.judging.completeEngineeringNotebookRubric._def._resolver!({
				input: {
					judgeGroupId: groupId,
					submission: {
						id: uuidv4(),
						teamId: sampleTeamInfoAndData[0]!.id,
						judgeId: otherJudgeId,
						rubric: createEmptyNotebookRubricScores(),
						notes: '',
						innovateAwardNotes: '',
						timestamp: Date.now()
					}
				},
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(/bound judge/);
	});

	it('rejects updating another judge authored rubric under access control', async () => {
		const links = await enableAccessControl();
		const otherJudgeId = uuidv4();
		await upsertJudge(context.db, { id: otherJudgeId, name: 'Other', groupId });
		const otherToken = generateAuthToken();
		await context.db.update(judges).set({ authToken: otherToken }).where(eq(judges.id, otherJudgeId));

		const otherDeviceSession = makeSession('550e8400-e29b-41d4-a716-4466554400ee');
		const otherCtx = await ctxWithAuth(otherToken);
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: otherDeviceSession,
			ctx: otherCtx
		});

		const rubricId = uuidv4();
		await serverRouter.judging.completeEngineeringNotebookRubric._def._resolver!({
			input: {
				judgeGroupId: groupId,
				submission: {
					id: rubricId,
					teamId: sampleTeamInfoAndData[0]!.id,
					judgeId: otherJudgeId,
					rubric: createEmptyNotebookRubricScores(),
					notes: 'mine',
					innovateAwardNotes: '',
					timestamp: Date.now()
				}
			},
			session: otherDeviceSession,
			ctx: otherCtx
		});

		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		const judgeCtx = await ctxWithAuth(judgeToken);
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: judgeCtx
		});

		await expect(
			serverRouter.judging.completeEngineeringNotebookRubric._def._resolver!({
				input: {
					judgeGroupId: groupId,
					submission: {
						id: rubricId,
						teamId: sampleTeamInfoAndData[0]!.id,
						judgeId,
						rubric: createEmptyNotebookRubricScores(),
						notes: 'hijack',
						innovateAwardNotes: '',
						timestamp: Date.now()
					}
				},
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(/authored/);
	});

	it('allows the same device to rejoin with a different access link', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(judgeToken)
		});

		const result = await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(links.judgeAdvisorAuthToken)
		});
		expect(result.authentication).toMatchObject({ isAccessControlled: true, role: 'judge_advisor' });
	});

	it('includes authenticated from connected device attachments in getDevices', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(judgeToken)
		});

		context.network.getAllAuthenticatedDevices = () =>
			new Map([[judgeDeviceId, { role: 'judge' as const, judgeId }]]);

		const devices = await serverRouter.device.getDevices._def._resolver!({
			input: undefined,
			session: jaSession,
			ctx: context
		});
		const judgeDevice = devices.find((d) => d.deviceId === judgeDeviceId);
		expect(judgeDevice?.authenticated).toEqual({ role: 'judge', judgeId });
	});

	it('enforces unique judge authToken index', async () => {
		await enableAccessControl();
		const token = generateAuthToken();
		const otherJudgeId = uuidv4();
		await context.db.insert(judges).values({ id: otherJudgeId, name: 'A', groupId, authToken: token });

		await expect(
			context.db.insert(judges).values({ id: uuidv4(), name: 'B', groupId, authToken: token })
		).rejects.toThrow();
	});

	it('createJudgesRoom with access control mints JA token', async () => {
		const fresh = createTestServerContext();
		try {
			fresh.auth = Authentication.withFixture();

			const essential = {
				robotEventsSku: null,
				robotEventsEventId: null,
				divisionId: null,
				eventName: 'Protected Event',
				program: 'VIQRC' as const,
				eventGradeLevel: 'MS Only' as const,
				judgingMethod: 'assigned' as const,
				judgingStep: 'beginning' as const,
				accessControlEnabled: true,
				teamInfos: [sampleTeamInfoAndData[0]!],
				judgeGroups: [{ id: groupId, name: 'Group 1', assignedTeams: [sampleTeamInfoAndData[0]!.id] }],
				awards: []
			};

			const result = await serverRouter.handshake.createJudgesRoom._def._resolver!({
				input: {
					essentialData: essential,
					teamData: [
						{
							id: sampleTeamInfoAndData[0]!.id,
							notebookLink: '',
							hasInnovateAwardSubmissionForm: false,
							notebookDevelopmentStatus: 'undetermined',
							absent: false
						}
					],
					judges: [{ id: judgeId, name: 'Judge One', groupId }]
				},
				session: jaSession,
				ctx: fresh
			});

			expect(result).toMatchObject({ isAccessControlled: true, role: 'judge_advisor' });
			if (result.isAccessControlled) {
				expect(await getJudgeAdvisorAuthToken(fresh.db)).toBe(result.authToken);
			}

			const [meta] = await fresh.db.select().from(metadata).limit(1);
			expect(meta?.accessControlEnabled).toBe(true);
		} finally {
			fresh.cleanup();
		}
	});

	it('createJudgesRoom mints JA token without connection auth', async () => {
		const fresh = createTestServerContext();
		try {
			fresh.auth = Authentication.withFixture();

			const essential = {
				robotEventsSku: null,
				robotEventsEventId: null,
				divisionId: null,
				eventName: 'Protected Event',
				program: 'VIQRC' as const,
				eventGradeLevel: 'MS Only' as const,
				judgingMethod: 'assigned' as const,
				judgingStep: 'beginning' as const,
				accessControlEnabled: false,
				teamInfos: [sampleTeamInfoAndData[0]!],
				judgeGroups: [{ id: groupId, name: 'Group 1', assignedTeams: [sampleTeamInfoAndData[0]!.id] }],
				awards: []
			};

			const result = await serverRouter.handshake.createJudgesRoom._def._resolver!({
				input: {
					essentialData: essential,
					teamData: [
						{
							id: sampleTeamInfoAndData[0]!.id,
							notebookLink: '',
							hasInnovateAwardSubmissionForm: false,
							notebookDevelopmentStatus: 'undetermined',
							absent: false
						}
					],
					judges: [{ id: judgeId, name: 'Judge One', groupId }]
				},
				session: jaSession,
				ctx: fresh
			});

			expect(result).toEqual({ isAccessControlled: false });
			expect(await getJudgeAdvisorAuthToken(fresh.db)).toBeTruthy();
		} finally {
			fresh.cleanup();
		}
	});
});
