import z from 'zod';
import { getEssentialData, hasEssentialData, updateEssentialData } from './essential';
import { EssentialDataSchema } from '@judgesroom.com/protocol/src/event';
import { TeamDataSchema } from '@judgesroom.com/protocol/src/team';
import { JudgeSchema } from '@judgesroom.com/protocol/src/judging';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import { getTeamData, updateTeamData } from './team';
import { getJudges, upsertJudge } from './judge';
import { broadcastDeviceListUpdate, getDevices } from './device';
import type { ServerContext } from '../server-router';
import { offlineDevices } from '../db/schema';
import { transaction } from '../utils';
import { WRPCError } from '@judgesroom.com/wrpc/server/types';
import { AwardNameSchema } from '@judgesroom.com/protocol/src/award';
import { AwardNominationSchema } from '@judgesroom.com/protocol/src/rubric';
import { getFinalAwardNominations } from './judging';

export const StarterKitSchema = z.object({
	essentialData: EssentialDataSchema,
	teamData: z.array(TeamDataSchema),
	judges: z.array(JudgeSchema)
});

export type StarterKit = z.infer<typeof StarterKitSchema>;

export const JoiningKitSchema = z.object({
	essentialData: EssentialDataSchema,
	teamData: z.array(TeamDataSchema),
	judges: z.array(JudgeSchema),
	finalAwardNominations: z.record(AwardNameSchema, z.array(AwardNominationSchema))
});

export type JoiningKit = z.infer<typeof JoiningKitSchema>;

export function buildHandshakeRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		joinJudgesRoom: w.procedure.output(JoiningKitSchema).mutation(async ({ ctx, session }) => {
			const hasExistingEssentialData = await hasEssentialData(ctx.db);
			if (!hasExistingEssentialData) {
				throw new WRPCError('Judges\' Room not found');
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
			broadcastDeviceListUpdate(ctx.db, ctx.network, session);

			return transaction(ctx.db, async (tx) => {
				return {
					essentialData: await getEssentialData(tx),
					teamData: await getTeamData(tx),
					judges: await getJudges(tx),
					finalAwardNominations: await getFinalAwardNominations(tx)
				};
			});
		}),

		createJudgesRoom: w.procedure
			.input(StarterKitSchema)
			.output(z.object({ success: z.boolean(), message: z.string() }))
			.mutation(async ({ ctx, input, session }) => {
				// return false if has essential data
				const hasExistingEssentialData = await hasEssentialData(ctx.db);
				if (hasExistingEssentialData) {
					return { success: false, message: 'Judges\' Room already exists' };
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

				// No need to broadcast device list update since it is a new Judges\' Room

				return transaction(ctx.db, async (tx) => {
					await updateEssentialData(tx, input.essentialData);

					await Promise.all(input.teamData.map((team) => updateTeamData(tx, team)));

					await Promise.all(input.judges.map((judge) => upsertJudge(tx, judge)));

					return { success: true, message: 'Judges\' Room created' };
				});
			}),

		destroyJudgesRoom: w.procedure.mutation(async ({ ctx }) => {
			await ctx.network.destroy();

			return { success: true, message: 'Judges\' Room destroyed' };
		})
	};
}
