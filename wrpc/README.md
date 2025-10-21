## WRPC — Typed WebSocket RPC for Client↔Server and Server→Client calls

WRPC is a lightweight, type-safe RPC layer over WebSockets, inspired by tRPC's developer ergonomics but designed for bidirectional communication. It provides:

- **Typed procedures**: `query` and `mutation` with Zod-driven input/output validation
- **Routers**: nestable, composable routers mirroring your API structure
- **Sessions**: symmetric APIs for server→client, client→server, and server→all-clients
- **WebSocket hibernation support**: a `ConnectionManager` designed for environments like Cloudflare Durable Objects

### Install

This package is part of the Judges' Room monorepo and is used by the Worker and Web application.

### Concepts

- **Procedure**: A callable endpoint with a type (`query` or `mutation`), optional Zod input/output schemas, and a resolver.
- **Router**: A tree of procedures (and nested routers). Built with `initWRPC` root and `root.router`.
- **Session**: Provided to resolvers, enabling bidirectional calls.
  - On the server: `session.getClient(clientId)` and `session.broadcast()` call client procedures.
  - On the client: `session.getServer()` calls server procedures.
- **Handler**: `createWebSocketHandler` drives message handling, connection lifecycle, and integrates storage (e.g., Durable Objects).
- **Client**: `createWRPCClient` provides a typed `wrpc` proxy to call server procedures and a `WebsocketClient` for connection lifecycle.

## Server Setup

Define your server-side router and WebSocket handler.

```ts
// server/router.ts
import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/server';

// 1) Initialize WRPC root (optionally provide default meta)
const root = initWRPC.createServer<{ userId?: string }>();

// 2) Define procedures using the builder
const hello = root.procedure
	.input(z.object({ name: z.string().min(1) }))
	.output(z.object({ greeting: z.string() }))
	.query(async ({ input }) => {
		return { greeting: `Hello, ${input.name}!` };
	});

const notifyClient = root.procedure.input(z.object({ clientId: z.string(), message: z.string() })).mutation(async ({ input, session }) => {
	// Server → specific client call (client must implement a matching procedure)
	await session.getClient<typeof clientRouter>(input.clientId).notifications.push.mutation({
		message: input.message
	});
	return { ok: true };
});

// 3) Compose your router
export const appRouter = root.router({
	hello,
	admin: {
		notifyClient
	}
});

export type AppRouter = typeof appRouter;
```

Integrate the WebSocket handler (example: Cloudflare Durable Object with hibernation).

```ts
// server/handler.ts
import { createWebSocketHandler } from '@judging.jerryio/wrpc/server';
import { appRouter } from './router';

// Storage helpers for Durable Object (shape is app-defined)
const storage = { data: null as unknown };

export const handler = createWebSocketHandler({
	router: appRouter,
	loadData: async () => storage.data,
	saveData: async (data) => {
		storage.data = data;
	},
	destroy: async () => {
		storage.data = null;
	},
	getWebSocket: (clientId) => {
		// Return the active WebSocket for a clientId (from your DO connection map)
		return activeSockets.get(clientId) ?? null;
	},
	getClientIdByWebSocket: (ws) => reverseSocketIndex.get(ws) ?? null,
	onError: ({ error, req }) => {
		console.error('WRPC Server Error', error, req);
	}
});

// Your DO constructor should call:
// await handler.initialize();
// And your DO lifecycle should call:
// handler.handleMessage(ws, message, ctx)
// handler.handleConnection(ws, { roomId, clientId, deviceId, deviceName })
// handler.handleClose(ws, code, reason)
```

## Client Setup

Define the client router (procedures the server may call on the client), then create the client and call server procedures via the typed proxy.

```ts
// client/index.ts
import { z } from 'zod';
import { createWRPCClient } from '@judging.jerryio/wrpc/client';
import type { AppRouter } from '../server/router';
import { initWRPC } from '@judging.jerryio/wrpc/server';

// 1) Client router (procedures the server can call on the client)
const root = initWRPC.createClient<AppRouter>();
export const clientRouter = root.router({
	notifications: {
		push: root.procedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
			// Handle a server → client mutation
			console.log('Notification:', input.message);
			return { received: true };
		})
	}
});

// 2) Create client and a typed WRPC proxy for calling server
const [client, wrpc] = createWRPCClient<AppRouter, typeof clientRouter>(
	{
		wsUrl: 'wss://example.com/ws',
		roomId: 'room-1',
		clientId: 'client-123',
		deviceId: 'device-xyz',
		deviceName: 'My Laptop',
		onContext: async () => ({}),
		onOpen: () => console.log('connected'),
		onClosed: (code, reason) => console.log('closed', code, reason),
		onConnectionStateChange: (s) => console.log('state:', s)
	},
	clientRouter
);

// 3) Call server procedures with full type safety
async function run() {
	const res = await wrpc.hello.query({ name: 'Jerry' });
	//    ^? { greeting: string }
	console.log(res.greeting);
}

run();
```

You can also manage a singleton client instance with the built-in manager:

```ts
import { createClientManager } from '@judging.jerryio/wrpc/client';

export const wrpcManager = createClientManager<AppRouter, typeof clientRouter>(
	() => ({
		wsUrl: 'wss://example.com/ws',
		roomId: 'room-1',
		clientId: 'client-123',
		deviceId: 'device-xyz',
		onContext: async () => ({}),
		onOpen: () => {},
		onClosed: () => {},
		onConnectionStateChange: () => {}
	}),
	clientRouter
);

const [client, wrpc] = wrpcManager.getClient();
```

## Bidirectional Calls via Session

Server resolver receives a `session`:

```ts
// Server → one client
await session.getClient<typeof clientRouter>(clientId).notifications.push.mutation({ message: 'Hello!' });

// Server → all clients (broadcast)
await session.broadcast<typeof clientRouter>().notifications.push.mutation({ message: 'Hi everyone!' });
```

Client resolver receives a `session`:

```ts
// Client → server
const data = await session.getServer().admin.notifyClient.mutation({ clientId, message: 'pong' });
```

## API Reference (selected)

- `initWRPC.createServer(opts?)` / `initWRPC.createClient<ServerRouter>(opts?)`
  - Produces `{ procedure, router, mergeRouters, _config }` bound to your root types
- `procedure`
  - `.input(zod)`, `.output(zod)`, `.meta(meta)`
  - `.query(resolver)`, `.mutation(resolver)` where `resolver({ input, session, ctx })`
- `router`
  - `root.router({ ... })` creates a nested router. `mergeRouters(a, b)` merges routers.
- `createWebSocketHandler({ router, loadData, saveData, destroy, getWebSocket, getClientIdByWebSocket, onError? })`
  - Returns `{ connectionManager, initialize, handleMessage, handleConnection, handleClose, handleError, getClient, broadcast }`
- `createWRPCClient(options, clientRouter)`
  - Returns `[WebsocketClient, wrpcProxy]` where `wrpcProxy` mirrors server router structure
- `WRPCClientManager`
  - `getClient()`, `resetClient()`, `isConnected()`, `getConnectionState()`

### Message Shapes

Validated with Zod:

```ts
type WRPCRequest = {
	kind: 'request';
	id: string;
	type: 'query' | 'mutation';
	path: string; // e.g. "admin.notifyClient"
	input: unknown;
};

type WRPCResponse =
	| { kind: 'response'; id: string; result: { type: 'data'; data: unknown } }
	| { kind: 'response'; id: string; result: { type: 'error'; error: { message: string; code?: string } } };
```

## Notes

- Input/output validation is optional; omit `.input()`/`.output()` to skip runtime validation.
- Server and client routers are independent and can evolve separately; only the paths actually invoked need to match.
- The connection manager supports Cloudflare WebSocket hibernation patterns but can be adapted to other environments by implementing the required handler options.
