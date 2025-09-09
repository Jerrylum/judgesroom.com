import { ClientInfoSchema } from '@judging.jerryio/protocol/src/client';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import z from 'zod';
import { offlineClients } from '../db/schema';
import type { Network } from '@judging.jerryio/wrpc/server';
import type { RouterBroadcastProxy, WRPCRootObject } from '@judging.jerryio/wrpc/server';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { eq } from 'drizzle-orm';

export async function getClients(tx: DatabaseOrTransaction, network: Network) {
	const listOfOfflineClients = await tx.select().from(offlineClients);

	return listOfOfflineClients.map((client) => ({
		clientId: client.clientId,
		deviceName: client.deviceName,
		connectedAt: client.connectedAt.getTime(),
		isOnline: network.isClientConnected(client.clientId)
	}));
}

export async function kickClient(db: DatabaseOrTransaction, network: Network, clientId: string) {
	await db.delete(offlineClients).where(eq(offlineClients.clientId, clientId));

	if (network.isClientConnected(clientId)) {
		await network.kickClient(clientId);
		return { success: true };
	} else {
		return { success: false };
	}
}

export function broadcastClientListUpdate(tx: DatabaseOrTransaction, network: Network, broadcast: RouterBroadcastProxy<ClientRouter>) {
	getClients(tx, network).then((clients) => {
		broadcast.onClientListUpdate.mutation(clients);
	});
}

export function buildClientRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getClients: w.procedure.output(z.array(ClientInfoSchema)).query(async ({ ctx }) => {
			return getClients(ctx.db, ctx.network);
		}),

		kickClient: w.procedure.input(z.object({ clientId: z.string() })).mutation(async ({ ctx, input, session }) => {
			const result = await kickClient(ctx.db, ctx.network, input.clientId);
			broadcastClientListUpdate(ctx.db, ctx.network, session.broadcast<ClientRouter>());
			return result;
		})
	};
}
