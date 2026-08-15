import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { AuthTokenSchema } from '@judgesroom.com/protocol/src/access';
import { RoomIdSchema } from '@judgesroom.com/protocol/src/room-id';
import { serverRouter } from './server-router';
import { createTestServerContext, seedTestDatabase, sampleTeamInfoAndData } from './test-utils';
import { Authentication } from './access/authentication';
import { metadata } from './db/schema';
import type { ServerContext } from './server-router';
import type { AnyRouter, Session } from '@jerrylum/wrpc/server';

import { parseRoomId } from './room-id';

const ConnectIntentionSchema = z.object({
	roomId: RoomIdSchema,
	clientId: z.uuidv4(),
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(20),
	action: z.enum(['create', 'join', 'rejoin']),
	auth: AuthTokenSchema.nullable()
});

function makeSession(deviceId: string): Session<AnyRouter> {
	return {
		getClient: () =>
			({
				onClientAuthenticationChange: { mutation: async () => undefined }
			}) as never,
		broadcast: () =>
			({
				onDeviceListUpdate: { notify: () => {} },
				onEventSetupUpdate: { notify: () => {} },
				onAllJudgesUpdate: { notify: () => {} },
				onAllTeamDataUpdate: { notify: () => {} },
				onTeamDataUpdate: { notify: () => {} },
				onReassignTeams: { notify: () => {} }
			}) as never,
		getServer: () => {
			throw new Error('getServer() cannot be called from server-side session');
		},
		roomId: '550e8400-e29b-41d4-a716-446655440099',
		currentClient: {
			clientId: `${deviceId}-client`,
			deviceId,
			deviceName: 'Test Device'
		}
	};
}

describe('room identity — connect intention (WebSocket /ws)', () => {
	it('requires a roomId (uuid v4 or 18-char token), plus uuid v4 clientId and deviceId', () => {
		const valid = {
			roomId: '550e8400-e29b-41d4-a716-446655440000',
			clientId: '550e8400-e29b-41d4-a716-446655440001',
			deviceId: '550e8400-e29b-41d4-a716-446655440002',
			deviceName: 'Chrome Browser',
			action: 'join' as const,
			auth: null
		};
		expect(ConnectIntentionSchema.parse(valid).roomId).toBe(valid.roomId);
		expect(ConnectIntentionSchema.safeParse({ ...valid, roomId: 'Ab3-_xY9QRstuvW012' }).success).toBe(true);
		expect(ConnectIntentionSchema.safeParse({ ...valid, roomId: 'not-a-uuid' }).success).toBe(false);
		expect(ConnectIntentionSchema.safeParse({ ...valid, roomId: '' }).success).toBe(false);
		expect(ConnectIntentionSchema.safeParse({ ...valid, roomId: 'room-1' }).success).toBe(false);
		expect(ConnectIntentionSchema.safeParse({ ...valid, roomId: 'abcdefghijkl' }).success).toBe(false);
	});

	it('caps deviceName at 20 characters (connect query)', () => {
		const valid = {
			roomId: '550e8400-e29b-41d4-a716-446655440000',
			clientId: '550e8400-e29b-41d4-a716-446655440001',
			deviceId: '550e8400-e29b-41d4-a716-446655440002',
			deviceName: '12345678901234567890',
			action: 'join' as const,
			auth: null
		};
		expect(ConnectIntentionSchema.safeParse(valid).success).toBe(true);
		expect(ConnectIntentionSchema.safeParse({ ...valid, deviceName: '123456789012345678901' }).success).toBe(false);
	});

	it('accepts a 12-char auth token or null, not an empty string', () => {
		const base = {
			roomId: '550e8400-e29b-41d4-a716-446655440000',
			clientId: '550e8400-e29b-41d4-a716-446655440001',
			deviceId: '550e8400-e29b-41d4-a716-446655440002',
			deviceName: 'Pad',
			action: 'join' as const
		};
		expect(ConnectIntentionSchema.safeParse({ ...base, auth: null }).success).toBe(true);
		expect(ConnectIntentionSchema.safeParse({ ...base, auth: 'abcdefghijkl' }).success).toBe(true);
		expect(ConnectIntentionSchema.safeParse({ ...base, auth: '' }).success).toBe(false);
		expect(ConnectIntentionSchema.safeParse({ ...base, auth: 'short' }).success).toBe(false);
	});
});

describe('room identity — handshake with only a roomId', () => {
	let context: ServerContext & { cleanup: () => void };
	const session = makeSession('550e8400-e29b-41d4-a716-4466554400aa');

	beforeEach(() => {
		context = createTestServerContext();
	});

	afterEach(async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		context.cleanup();
	});

	it('joinJudgesRoom fails on an unused room (empty Durable Object)', async () => {
		await expect(
			serverRouter.handshake.joinJudgesRoom._def._resolver!({
				input: undefined,
				session,
				ctx: context
			})
		).rejects.toThrow("Judges' Room not found");
	});

	it('intended: AC-off, knowing roomId is enough to read the whole room', async () => {
		await seedTestDatabase(context);
		const result = await serverRouter.handshake.joinJudgesRoom._def._resolver!({
			input: undefined,
			session,
			ctx: context
		});
		expect(result.essentialData.accessControlEnabled).toBe(false);
		expect(result.authentication).toEqual({ isAccessControlled: false });
		expect(result.essentialData.eventName).toBe('Test Event');
		expect(result.teamData.length).toBeGreaterThan(0);
	});

	it('getMetadata-equivalent query is unauthenticated (join-page preview source)', async () => {
		await seedTestDatabase(context);
		const rows = await context.db.select().from(metadata).limit(1);
		expect(rows[0]?.eventName).toBe('Test Event');
		expect(rows[0]?.robotEventsSku ?? null).toBeDefined();
	});

	it('createJudgesRoom on an empty room succeeds; a second create is rejected', async () => {
		context.auth = Authentication.withFixture();
		const groupId = 'group-1';
		const team = sampleTeamInfoAndData[0]!;
		const input = {
			essentialData: {
				robotEventsSku: null,
				robotEventsEventId: null,
				divisionId: null,
				eventName: 'New Event',
				program: 'VIQRC' as const,
				eventGradeLevel: 'MS Only' as const,
				judgingMethod: 'assigned' as const,
				judgingStep: 'beginning' as const,
				accessControlEnabled: false,
				teamInfos: [team],
				judgeGroups: [{ id: groupId, name: 'Group 1', assignedTeams: [team.id] }],
				awards: []
			},
			teamData: [
				{
					id: team.id,
					notebookLink: '',
					hasInnovateAwardSubmissionForm: false,
					notebookDevelopmentStatus: 'undetermined' as const,
					absent: false
				}
			],
			judges: []
		};

		const first = await serverRouter.handshake.createJudgesRoom._def._resolver!({
			input,
			session,
			ctx: context
		});
		expect(first).toEqual({ isAccessControlled: false });

		await expect(
			serverRouter.handshake.createJudgesRoom._def._resolver!({
				input,
				session,
				ctx: context
			})
		).rejects.toThrow(/already exists/);
	});
});

describe('room identity — GET /join and /media roomId', () => {
	it('parseRoomId rejects names that must not reach idFromName', () => {
		expect(parseRoomId(null)).toBeNull();
		expect(parseRoomId('')).toBeNull();
		expect(parseRoomId('probe')).toBeNull();
		expect(parseRoomId('../../../etc')).toBeNull();
		expect(parseRoomId('550e8400-e29b-41d4-a716-446655440000')).toBe(
			'550e8400-e29b-41d4-a716-446655440000'
		);
		expect(parseRoomId('Ab3-_xY9QRstuvW012')).toBe('Ab3-_xY9QRstuvW012');
		expect(parseRoomId('abcdefghijkl')).toBeNull();
	});
});
