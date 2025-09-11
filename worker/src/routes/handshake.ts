import z from 'zod';
import { getEssentialData, hasEssentialData, updateEssentialData } from './essential';
import { EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { TeamDataSchema } from '@judging.jerryio/protocol/src/team';
import { JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import { type ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import { getTeamData, updateTeamData } from './team';
import { getJudges, upsertJudge } from './judge';
import { broadcastDeviceListUpdate, getDevices } from './device';
import type { ServerContext } from '../server-router';
import { offlineDevices } from '../db/schema';
import { transaction } from '../utils';
import { WRPCError } from '@judging.jerryio/wrpc/server/types';

export const StarterKitSchema = z.object({
	essentialData: EssentialDataSchema,
	teamData: z.array(TeamDataSchema),
	judges: z.array(JudgeSchema)
});

export type StarterKit = z.infer<typeof StarterKitSchema>;

export function buildHandshakeRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		joinSession: w.procedure.output(StarterKitSchema).mutation(async ({ ctx, session }) => {
			const hasExistingEssentialData = await hasEssentialData(ctx.db);
			if (!hasExistingEssentialData) {
				throw new WRPCError('Session not found');
			}

			const offlineDevice = {
				deviceId: session.currentClient.deviceId,
				deviceName: session.currentClient.deviceName,
				connectedAt: new Date()
			};

			// insert or update
			await ctx.db
				.insert(offlineDevices)
				.values(offlineDevice)
				.onConflictDoUpdate({
					target: [offlineDevices.deviceId],
					set: offlineDevice
				});

			// Broadcast client list update to all clients
			// Do not wait for the broadcast to complete
			broadcastDeviceListUpdate(ctx.db, ctx.network, session.broadcast<ClientRouter>());

			return transaction(ctx.db, async (tx) => {
				return {
					essentialData: await getEssentialData(tx),
					teamData: await getTeamData(tx),
					judges: await getJudges(tx)
				};
			});
		}),

		createSession: w.procedure
			.input(StarterKitSchema)
			.output(z.object({ success: z.boolean(), message: z.string() }))
			.mutation(async ({ ctx, input, session }) => {
				// return false if has essential data
				const hasExistingEssentialData = await hasEssentialData(ctx.db);
				if (hasExistingEssentialData) {
					return { success: false, message: 'Session already exists' };
				}

				const offlineDevice = {
					deviceId: session.currentClient.deviceId,
					deviceName: session.currentClient.deviceName,
					connectedAt: new Date()
				};

				// insert or update
				await ctx.db
					.insert(offlineDevices)
					.values(offlineDevice)
					.onConflictDoUpdate({
						target: [offlineDevices.deviceId],
						set: offlineDevice
					});

				// TODO :broadcast to all listening devices
				// Do not wait for the broadcast to complete
				getDevices(ctx.db, ctx.network).then((devices) => {
					session.broadcast<ClientRouter>().onDeviceListUpdate.mutation(devices);
				});

				return transaction(ctx.db, async (tx) => {
					await updateEssentialData(tx, input.essentialData);

					await Promise.all(input.teamData.map((team) => updateTeamData(tx, team)));

					await Promise.all(input.judges.map((judge) => upsertJudge(tx, judge)));

					return { success: true, message: 'Session created' };
				});
			}),

		destroySession: w.procedure.mutation(async ({ ctx }) => {
			// TODO: Broadcast to all clients

			await ctx.network.destroy();

			return { success: true, message: 'Session destroyed' };
		})
	};
}
