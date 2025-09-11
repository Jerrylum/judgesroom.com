import { DeviceInfoSchema } from '@judging.jerryio/protocol/src/client';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import z from 'zod';
import { offlineDevices } from '../db/schema';
import type { Network } from '@judging.jerryio/wrpc/server';
import type { RouterBroadcastProxy, WRPCRootObject } from '@judging.jerryio/wrpc/server';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { eq } from 'drizzle-orm';

export async function getDevices(tx: DatabaseOrTransaction, network: Network) {
	const listOfOfflineDevices = await tx.select().from(offlineDevices);
	return listOfOfflineDevices.map((device) => ({
		deviceId: device.deviceId,
		deviceName: device.deviceName,
		connectedAt: device.connectedAt.getTime(),
		isOnline: network.isDeviceConnected(device.deviceId)
	}));
}

export async function kickDevice(tx: DatabaseOrTransaction, network: Network, deviceId: string) {
	await tx.delete(offlineDevices).where(eq(offlineDevices.deviceId, deviceId));
	if (network.isDeviceConnected(deviceId)) {
		for (const client of network.getAllClientData()) {
			if (client.deviceId === deviceId) {
				await network.kickClient(client.clientId);
			}
		}
		return { success: true };
	}
}

export function broadcastDeviceListUpdate(tx: DatabaseOrTransaction, network: Network, broadcast: RouterBroadcastProxy<ClientRouter>) {
	getDevices(tx, network).then((devices) => {
		broadcast.onDeviceListUpdate.mutation(devices);
	});
}

export function buildDeviceRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getDevices: w.procedure.output(z.array(DeviceInfoSchema)).query(async ({ ctx }) => {
			return getDevices(ctx.db, ctx.network);
		}),

		kickDevice: w.procedure.input(z.object({ deviceId: z.string() })).mutation(async ({ ctx, input, session }) => {
			const result = await kickDevice(ctx.db, ctx.network, input.deviceId);
			broadcastDeviceListUpdate(ctx.db, ctx.network, session.broadcast<ClientRouter>());
			return result;
		})
	};
}
