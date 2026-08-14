import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { serverRouter } from '../server-router';
import { createTestServerContext, seedTestDatabase, sampleTeamInfoAndData } from '../test-utils';
import type { ServerContext } from '../server-router';
import type { AnyRouter, Session } from '@jerrylum/wrpc/server';
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
					onReassignTeams: { mutation: async () => [] },
					onSubmissionCacheUpdate: { mutation: async () => [] },
					onReviewedTeamsUpdate: { mutation: async () => [] },
					onTeamDataUpdate: { mutation: async () => [] },
					onAwardDeliberationStarted: { mutation: async () => [] },
					onFinalAwardNominationsUpdate: { mutation: async () => [] },
					onAwardRankingsUpdate: { mutation: async () => [] }
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
		const denied = await context.network.authorizeConnect(otherDeviceId, null);
		expect(denied.allowed).toBe(false);
		if (!denied.allowed) {
			expect(denied.reason).toMatch(/access link required/i);
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

	it('forbids JA-only mutations for a bound judge', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		const judgeCtx = await ctxWithAuth(judgeToken);
		const jaOnly = /Judge Advisor/;

		await expect(
			serverRouter.access.listAccessLinks._def._resolver!({
				input: undefined,
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		await expect(
			serverRouter.access.rotateJudgeAuth._def._resolver!({
				input: { judgeId },
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		await expect(
			serverRouter.access.rotateJudgeAdvisorAuth._def._resolver!({
				input: undefined,
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		await expect(
			serverRouter.judge.updateJudge._def._resolver!({
				input: { id: judgeId, name: 'Hijack', groupId },
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		await expect(
			serverRouter.judge.removeJudge._def._resolver!({
				input: { judgeId },
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		await expect(
			serverRouter.judge.updateAllJudges._def._resolver!({
				input: [],
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		await expect(
			serverRouter.essential.reassignTeam._def._resolver!({
				input: { teamId: sampleTeamInfoAndData[0]!.id, toJudgeGroupId: groupId },
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);

		const essential = await getEssentialData(context.db);
		await expect(
			serverRouter.essential.updateEssentialData._def._resolver!({
				input: { ...essential, accessControlEnabled: false },
				session: judgeSession,
				ctx: judgeCtx
			})
		).rejects.toThrow(jaOnly);
	});

	it('allows a bound judge to write shared room data', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		const judgeCtx = await ctxWithAuth(judgeToken);
		const teamId = sampleTeamInfoAndData[0]!.id;

		await serverRouter.team.updateTeamData._def._resolver!({
			input: {
				id: teamId,
				notebookLink: 'https://example.com/hijack',
				hasInnovateAwardSubmissionForm: true,
				notebookDevelopmentStatus: 'fully_developed',
				absent: true
			},
			session: judgeSession,
			ctx: judgeCtx
		});

		await serverRouter.judging.updateAwardRanking._def._resolver!({
			input: { judgeGroupId: groupId, teamId, awardName: 'Design Award', ranking: 1 },
			session: judgeSession,
			ctx: judgeCtx
		});

		await serverRouter.judging.nominateFinalAward._def._resolver!({
			input: { awardName: 'Design Award', teamId, judgeGroupId: groupId },
			session: judgeSession,
			ctx: judgeCtx
		});

		await serverRouter.judging.startAwardDeliberation._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: judgeCtx
		});

		const [meta] = await context.db.select().from(metadata).limit(1);
		expect(meta?.judgingStep).toBe('award_deliberations');
		expect(meta?.accessControlEnabled).toBe(true);
	});

	it('allows the Judge Advisor to complete a rubric as any judge', async () => {
		await enableAccessControl();
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
						notes: 'JA on behalf',
						innovateAwardNotes: '',
						timestamp: Date.now()
					}
				},
				session: jaSession,
				ctx: context
			})
		).resolves.toBeUndefined();
	});

	it('does not list access links when access control is off', async () => {
		await expect(
			serverRouter.access.listAccessLinks._def._resolver!({
				input: undefined,
				session: jaSession,
				ctx: context
			})
		).rejects.toThrow(/Judge Advisor/);
	});

	it('allows kick and roster edits when access control is off', async () => {
		await expect(
			serverRouter.device.kickDevice._def._resolver!({
				input: { deviceId: otherDeviceId },
				session: otherSession,
				ctx: context
			})
		).resolves.toBeUndefined();

		await expect(
			serverRouter.judge.updateJudge._def._resolver!({
				input: { id: judgeId, name: 'Anyone', groupId },
				session: otherSession,
				ctx: context
			})
		).resolves.toBeUndefined();
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
		const kickedJudgeIds: string[] = [];
		context.network.kickJudge = async (id) => {
			kickedJudgeIds.push(id);
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
		expect(kickedJudgeIds).toEqual([judgeId]);

		const denied = await context.network.authorizeConnect(judgeDeviceId, oldToken);
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
		const kickedClientIds: string[] = [];
		const otherJaClientId = `${otherDeviceId}-client`;
		context.network.getAllClientAuthentications = () => [
			{
				clientId: jaSession.currentClient.clientId,
				deviceId: jaDeviceId,
				authentication: { isAccessControlled: true, authToken: oldJaToken, role: 'judge_advisor' }
			},
			{
				clientId: otherJaClientId,
				deviceId: otherDeviceId,
				authentication: { isAccessControlled: true, authToken: oldJaToken, role: 'judge_advisor' }
			}
		];
		context.network.kickClient = async (clientId) => {
			kickedClientIds.push(clientId);
		};

		const rotated = await serverRouter.access.rotateJudgeAdvisorAuth._def._resolver!({
			input: undefined,
			session: jaSession,
			ctx: context
		});
		expect(rotated.authToken).not.toBe(oldJaToken);
		expect(kickedClientIds).toEqual([otherJaClientId]);
		expect(context.auth.authToken).toBe(rotated.authToken);
		expect(await getJudgeAdvisorAuthToken(context.db)).toBe(rotated.authToken);

		const denied = await context.network.authorizeConnect(otherDeviceId, oldJaToken);
		expect(denied.allowed).toBe(false);
	});

	it('closes sockets for deleted judge auth token', async () => {
		const links = await enableAccessControl();
		const oldToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		const kickedJudgeIds: string[] = [];
		context.network.kickJudge = async (id) => {
			kickedJudgeIds.push(id);
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

		expect(kickedJudgeIds).toEqual([judgeId]);
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
		).rejects.toThrow(/authenticated identity/);
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

	it('rejects the same device connecting with a different access link', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		context.network.getAllClientAuthentications = () => [
			{
				clientId: judgeSession.currentClient.clientId,
				deviceId: judgeDeviceId,
				authentication: { isAccessControlled: true, authToken: judgeToken, role: 'judge', judgeId }
			}
		];

		const denied = await context.network.authorizeConnect(judgeDeviceId, links.judgeAdvisorAuthToken);
		expect(denied.allowed).toBe(false);
		if (!denied.allowed) {
			expect(denied.reason).toMatch(/different credentials/i);
		}

		const same = await context.network.authorizeConnect(judgeDeviceId, judgeToken);
		expect(same.allowed).toBe(true);
	});

	it('includes authenticated from connected device attachments in getDevices', async () => {
		const links = await enableAccessControl();
		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session: judgeSession,
			ctx: await ctxWithAuth(judgeToken)
		});

		context.network.getAllClientAuthentications = () => [
			{
				clientId: judgeSession.currentClient.clientId,
				deviceId: judgeDeviceId,
				authentication: { isAccessControlled: true, authToken: judgeToken, role: 'judge', judgeId }
			}
		];

		const devices = await serverRouter.device.getDevices._def._resolver!({
			input: undefined,
			session: jaSession,
			ctx: context
		});
		const judgeDevice = devices.find((d) => d.deviceId === judgeDeviceId);
		expect(judgeDevice?.authenticated).toEqual({ role: 'judge', judgeId });
	});

	it('kicks every other client when access control is toggled on or off', async () => {
		const kicked: string[] = [];
		context.network.kickOtherClients = async (exceptClientId) => {
			kicked.push(exceptClientId);
		};

		await enableAccessControl();
		expect(kicked).toEqual([jaSession.currentClient.clientId]);

		const essential = await getEssentialData(context.db);
		await serverRouter.essential.updateEssentialData._def._resolver!({
			input: { ...essential, accessControlEnabled: false },
			session: jaSession,
			ctx: context
		});
		expect(kicked).toEqual([jaSession.currentClient.clientId, jaSession.currentClient.clientId]);
	});

	it('resolveClientAuthentication maps JA and judge tokens and rejects unknown ones', async () => {
		const links = await enableAccessControl();
		expect(await resolveClientAuthentication(context.db, links.judgeAdvisorAuthToken)).toMatchObject({
			isAccessControlled: true,
			role: 'judge_advisor',
			authToken: links.judgeAdvisorAuthToken
		});

		const judgeToken = links.judges.find((j) => j.judgeId === judgeId)!.authToken;
		expect(await resolveClientAuthentication(context.db, judgeToken)).toMatchObject({
			isAccessControlled: true,
			role: 'judge',
			judgeId,
			authToken: judgeToken
		});

		expect(await resolveClientAuthentication(context.db, 'abcdefghijkl')).toBeNull();
		expect(await resolveClientAuthentication(context.db, 'short')).toBeNull();
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
