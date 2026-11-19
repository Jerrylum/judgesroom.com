import { z } from 'zod';
import type { ClientAuthentication } from '@judgesroom.com/protocol/src/access';
import { StarterKitSchema, type StarterKit } from '@judgesroom.com/protocol/src/room';
import { generateRoomId } from '@judgesroom.com/protocol/src/room-id';
import { verifyTurnstileToken } from './turnstile';

const CreateRoomBodySchema = StarterKitSchema.extend({
	turnstileToken: z.string().optional()
});

export interface CreateRoomStub {
	createJudgesRoom(input: StarterKit): Promise<ClientAuthentication>;
}

export interface CreateRoomNamespace {
	idFromName(name: string): unknown;
	get(id: unknown): CreateRoomStub;
}

/**
 * Create a room over HTTP. Turnstile is checked before the Durable Object is asked to initialize.
 * A blank secret is the self-host path and skips siteverify. The response is sent only after the starter kit commits.
 */
export async function handleCreateRoom(
	request: Request,
	turnstileSecret: string | undefined,
	namespace: CreateRoomNamespace
): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return withCreateCors(request, new Response(null, { status: 204 }));
	}
	if (request.method !== 'POST') {
		return withCreateCors(request, new Response('Method not allowed', { status: 405 }));
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return withCreateCors(request, new Response('Invalid request', { status: 400 }));
	}

	const parsed = CreateRoomBodySchema.safeParse(body);
	if (!parsed.success) {
		return withCreateCors(request, new Response('Invalid request', { status: 400 }));
	}

	const turnstileSecretKey = turnstileSecret?.trim() ?? '';
	if (turnstileSecretKey) {
		const token = parsed.data.turnstileToken?.trim() ?? '';
		if (!token || !(await verifyTurnstileToken(token, turnstileSecretKey, request))) {
			return withCreateCors(request, new Response('Turnstile verification failed', { status: 403 }));
		}
	}

	const { turnstileToken: _turnstile, ...starterKit } = parsed.data;
	const roomId = generateRoomId();
	try {
		const authentication = await namespace.get(namespace.idFromName(roomId)).createJudgesRoom(starterKit);
		return withCreateCors(request, Response.json({ roomId, authentication }));
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to create room';
		const status = message.includes('already exists') ? 409 : 500;
		return withCreateCors(request, new Response(message, { status }));
	}
}

function withCreateCors(request: Request, response: Response): Response {
	const origin = request.headers.get('Origin');
	if (!origin) {
		return response;
	}

	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', origin);
	headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	headers.set('Vary', 'Origin');
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
