import { ClientInfoSchema } from '@judging.jerryio/protocol/src/client';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import z from 'zod';
import { offlineClients } from '../db/schema';
import { Network } from '@judging.jerryio/wrpc/server';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';

export async function getClients(tx: DatabaseOrTransaction, network: Network) {
	const listOfOfflineClients = await tx.select().from(offlineClients);

	return listOfOfflineClients.map((client) => ({
		clientId: client.clientId,
		deviceName: client.deviceName,
		connectedAt: client.connectedAt.getTime(),
		isOnline: network.isClientConnected(client.clientId)
	}));
}

export async function kickClient(network: Network, clientId: string) {
	if (network.isClientConnected(clientId)) {
		await network.kickClient(clientId);
		return { success: true };
	}
	return { success: false };
}

export function buildClientRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getClients: w.procedure.output(z.array(ClientInfoSchema)).query(async ({ ctx }) => {
			return getClients(ctx.db, ctx.network);
		}),

		kickClient: w.procedure.input(z.object({ clientId: z.string() })).mutation(async ({ ctx, input }) => {
			return kickClient(ctx.network, input.clientId);
		})
	};
}
