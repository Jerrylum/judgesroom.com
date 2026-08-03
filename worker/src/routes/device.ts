import { DeviceInfoSchema } from '@judgesroom.com/protocol/src/client';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import z from 'zod';
import { offlineDevices } from '../db/schema';
import type { Network } from '@judgesroom.com/wrpc/server';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import { eq, ne } from 'drizzle-orm';
import { assertAuthenticatedJudgeAdvisor } from '../access/tokens';
import { broadcastTopic, type ClientSource, subscribeTopic, unsubscribeTopic } from './subscriptions';

type DeviceListContext = Pick<ServerContext, 'db' | 'network'>;

export async function getDevices(ctx: DeviceListContext) {
	const listOfOfflineDevices = await ctx.db.select().from(offlineDevices);
	const authenticatedByDevice = ctx.network.getAllAuthenticatedDevices();
	return listOfOfflineDevices.map((device) => ({
		deviceId: device.deviceId,
		deviceName: device.deviceName,
		connectedAt: device.connectedAt.getTime(),
		isOnline: ctx.network.isDeviceConnected(device.deviceId),
		authenticated: authenticatedByDevice.get(device.deviceId) ?? null
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

export function broadcastDeviceListUpdate(ctx: DeviceListContext, source: ClientSource) {
	getDevices(ctx).then((devices) => {
		broadcastTopic(ctx.db, 'deviceList', source, (client) => {
			return client.onDeviceListUpdate.mutation(devices);
		});
	});
}

export function buildDeviceRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getDevices: w.procedure.output(z.array(DeviceInfoSchema)).query(async ({ ctx }) => {
			return getDevices(ctx);
		}),

		subscribeDeviceList: w.procedure.output(z.array(DeviceInfoSchema)).mutation(async ({ ctx, session }) => {
			await subscribeTopic(ctx.db, session.currentClient.clientId, 'deviceList');
			return getDevices(ctx);
		}),

		unsubscribeDeviceList: w.procedure.mutation(async ({ ctx, session }) => {
			await unsubscribeTopic(ctx.db, session.currentClient.clientId, 'deviceList');
		}),

		kickDevice: w.procedure.input(z.object({ deviceId: z.string() })).mutation(async ({ ctx, input, session }) => {
			if (ctx.auth.isAuthenticated()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}
			const result = await kickDevice(ctx.db, ctx.network, input.deviceId);
			// No need to broadcast device list update here, see webSocketClose
			return result;
		})
	};
}
