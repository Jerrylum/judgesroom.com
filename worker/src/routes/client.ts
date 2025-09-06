import { ClientInfoSchema } from '@judging.jerryio/protocol/src/client';
import { w } from '../server-router';
import z from 'zod';
import { offlineClients } from '../db/schema';

export const client = {
	getClients: w.procedure.output(z.array(ClientInfoSchema)).query(async ({ ctx }) => {
		const listOfOfflineClients = await ctx.db.select().from(offlineClients);

		return listOfOfflineClients.map((client) => ({
			clientId: client.clientId,
			deviceName: client.deviceName,
			connectedAt: client.connectedAt.getTime(),
			isOnline: ctx.network.isClientConnected(client.clientId)
		}));
	}),

	kickClient: w.procedure.input(z.object({ clientId: z.string() })).mutation(async ({ ctx, input }) => {
		if (ctx.network.isClientConnected(input.clientId)) {
			await ctx.network.kickClient(input.clientId);
			return { success: true };
		}
		return { success: false };
	})
};
