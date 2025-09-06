import { ClientInfo, ClientInfoSchema } from '@judging.jerryio/protocol/src/client';
import { DatabaseOrTransaction, w } from '../server-router';
import z from 'zod';

export const client = {
	getClients: w.procedure.output(z.array(ClientInfoSchema)).query(async ({ ctx, session }) => {
		// For now, return basic client info based on current session
		// In a full implementation, this would use ctx.network.getConnectedClients()
		const clientInfos: ClientInfo[] = [
			{
				clientId: session.currentClient.clientId,
				deviceName: session.currentClient.deviceName,
				connectedAt: Date.now(),
				isOnline: true
			}
		];

		return clientInfos;
	}),

	kickClient: w.procedure.input(z.object({ clientId: z.string() })).mutation(async ({ ctx, input }) => {
		// TODO: Implement when WRPC supports session.kickClient
		// This should use session.kickClient(input.clientId) when available
		return { success: false };
	})
};
