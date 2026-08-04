import { DeviceInfoSchema } from '@judgesroom.com/protocol/src/client';
import type { ServerContext } from '../server-router';
import z from 'zod';
import { offlineDevices } from '../db/schema';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import { assertAuthenticatedJudgeAdvisor } from '../access/tokens';
import { broadcastTopic, type ClientSource, subscribeTopic, unsubscribeTopic } from './subscriptions';
import { type DeviceAuthenticated, toDeviceAuthenticated } from '@judgesroom.com/protocol/src/access';

type DeviceListContext = Pick<ServerContext, 'db' | 'network'>;

export async function getDevices(ctx: DeviceListContext) {
	const listOfOfflineDevices = await ctx.db.select().from(offlineDevices);

	const roles = new Map<string, DeviceAuthenticated>();
	for (const entry of ctx.network.getAllClientAuthentications()) {
		const authenticated = toDeviceAuthenticated(entry.authentication);
		if (authenticated) {
			roles.set(entry.deviceId, authenticated);
		}
	}

	return listOfOfflineDevices.map((device) => ({
		deviceId: device.deviceId,
		deviceName: device.deviceName,
		connectedAt: device.connectedAt.getTime(),
		isOnline: ctx.network.isDeviceConnected(device.deviceId),
		authenticated: roles.get(device.deviceId) ?? null
	}));
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
			if (await ctx.network.isAccessControlEnabled()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}
			await ctx.network.kickDevice(input.deviceId);
			// Always broadcast: already-offline kicks do not get a webSocketClose update.
			broadcastDeviceListUpdate(ctx, session);
		})
	};
}
