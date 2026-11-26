import { afterEach, describe, expect, it, vi } from 'vitest';
import { TURNSTILE_SITEVERIFY_URL } from './turnstile';
import { handleCreateRoom, type CreateRoomNamespace } from './create-room';
import { sampleTeamInfoAndData } from './test-utils';

const team = sampleTeamInfoAndData[0]!;

const starterKit = {
	essentialData: {
		robotEventsSku: null,
		robotEventsEventId: null,
		divisionId: null,
		eventName: 'New Event',
		program: 'VIQRC' as const,
		eventGradeLevel: 'MS Only' as const,
		judgingMethod: 'assigned' as const,
		judgingStep: 'beginning' as const,
		accessControlEnabled: true,
		judgeGuideVersion: '2.0' as const,
		notebookRubricScoreStep: 0.1,
		interviewRubricScoreStep: 0.1,
		notebookSubmissionMethod: 'digital' as const,
		teamInfos: [
			{
				id: team.id,
				number: team.number,
				name: team.name,
				city: team.city,
				state: team.state,
				country: team.country,
				shortName: team.shortName,
				school: team.school,
				grade: team.grade,
				group: team.group
			}
		],
		judgeGroups: [{ id: '550e8400-e29b-41d4-a716-446655440010', name: 'Group 1', assignedTeams: [team.id] }],
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

function createRequest(body: unknown, headers?: HeadersInit): Request {
	return new Request('https://localhost/rooms', {
		method: 'POST',
		headers: { 'content-type': 'application/json', Host: 'localhost:8787', ...headers },
		body: JSON.stringify(body)
	});
}

function createNamespace(): { namespace: CreateRoomNamespace; calls: string[]; captured: { input: unknown } } {
	const calls: string[] = [];
	const captured: { input: unknown } = { input: undefined };
	const namespace: CreateRoomNamespace = {
		idFromName(name) {
			calls.push(`id:${name}`);
			return { name };
		},
		get(id) {
			calls.push(`get:${JSON.stringify(id)}`);
			return {
				createJudgesRoom: async (input) => {
					calls.push('create');
					captured.input = input;
					return { isAccessControlled: true, authToken: 'abcdefghijkl', role: 'judge_advisor' };
				}
			};
		}
	};
	return { namespace, calls, captured };
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('handleCreateRoom', () => {
	it('rejects an invalid body before touching a room', async () => {
		const { namespace, calls } = createNamespace();

		const response = await handleCreateRoom(createRequest({ eventName: 'nope' }), 'secret', namespace);

		expect(response.status).toBe(400);
		expect(calls).toEqual([]);
	});

	it('rejects a missing token before touching a room when a secret is configured', async () => {
		const { namespace, calls } = createNamespace();
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const response = await handleCreateRoom(createRequest(starterKit), 'secret', namespace);

		expect(response.status).toBe(403);
		expect(calls).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects a failed siteverify before touching a room', async () => {
		const { namespace, calls } = createNamespace();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ success: false, 'error-codes': ['invalid-input-response'] }))
		);

		const response = await handleCreateRoom(createRequest({ ...starterKit, turnstileToken: 'token' }), 'secret', namespace);

		expect(response.status).toBe(403);
		expect(calls).toEqual([]);
	});

	it('rejects a solved hostname that does not match the request host', async () => {
		const { namespace, calls } = createNamespace();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ success: true, hostname: 'evil.example' }))
		);

		const response = await handleCreateRoom(createRequest({ ...starterKit, turnstileToken: 'token' }), 'secret', namespace);

		expect(response.status).toBe(403);
		expect(calls).toEqual([]);
	});

	it('creates the room when siteverify used a testing key', async () => {
		const { namespace, calls } = createNamespace();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Response.json({
					success: true,
					hostname: 'example.com',
					metadata: { result_with_testing_key: true }
				})
			)
		);

		const response = await handleCreateRoom(createRequest({ ...starterKit, turnstileToken: 'token' }), 'secret', namespace);

		expect(response.status).toBe(200);
		expect(calls).toContain('create');
	});

	it('creates the room after siteverify succeeds', async () => {
		const { namespace, calls, captured } = createNamespace();
		const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
			expect(String(url)).toBe(TURNSTILE_SITEVERIFY_URL);
			expect(init?.method).toBe('POST');
			const body = String(init?.body);
			expect(body).toContain('secret=secret');
			expect(body).toContain('response=token');
			return Response.json({ success: true, hostname: 'localhost' });
		});
		vi.stubGlobal('fetch', fetchMock);

		const response = await handleCreateRoom(
			createRequest({ ...starterKit, turnstileToken: 'token' }, { Origin: 'http://localhost:5173' }),
			'secret',
			namespace
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
		const created = (await response.json()) as { roomId: string; authentication: { authToken: string } };
		expect(created.roomId).toHaveLength(18);
		expect(created.authentication).toEqual({ isAccessControlled: true, authToken: 'abcdefghijkl', role: 'judge_advisor' });
		expect(calls[0]).toBe(`id:${created.roomId}`);
		expect(calls).toContain('create');
		expect(captured.input).toEqual(starterKit);
	});

	it('creates a room without siteverify when the secret is blank', async () => {
		const { namespace, calls } = createNamespace();
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const response = await handleCreateRoom(createRequest(starterKit), '   ', namespace);

		expect(response.status).toBe(200);
		expect(calls).toContain('create');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('returns 409 when the room already exists', async () => {
		const namespace: CreateRoomNamespace = {
			idFromName: (name) => ({ name }),
			get: () => ({
				createJudgesRoom: async () => {
					throw new Error("Judges' Room already exists");
				}
			})
		};

		const response = await handleCreateRoom(createRequest(starterKit), undefined, namespace);

		expect(response.status).toBe(409);
	});
});
