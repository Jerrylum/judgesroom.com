import { getEssentialData, hasEssentialData, updateEssentialData } from './essential';
import { WRPCError, type WRPCRootObject } from '@jerrylum/wrpc/server';
import { getTeamData, updateTeamData } from './team';
import { getJudges, upsertJudge } from './judge';
import { broadcastDeviceListUpdate } from './device';
import type { ServerContext } from '../server-router';
import { offlineDevices } from '../db/schema';
import { transaction } from '../utils';
import { getFinalAwardNominations } from './judging';
import {
	ClientAuthenticationSchema,
	generateAuthToken,
	uncontrolledAuthentication
} from '@judgesroom.com/protocol/src/access';
import { JoiningKitSchema, StarterKitSchema, type JoiningKit, type RoomState, type StarterKit } from '@judgesroom.com/protocol/src/room';
import { assertAuthenticatedJudgeAdvisor, upsertJudgeAdvisorAuthToken } from '../access/tokens';

export { JoiningKitSchema, StarterKitSchema, type JoiningKit, type RoomState, type StarterKit };
export { RoomStateSchema } from '@judgesroom.com/protocol/src/room';

export function buildHandshakeRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		joinJudgesRoom: w.procedure.output(JoiningKitSchema).mutation(async ({ ctx, session }) => {
			const essentialData = await getEssentialData(ctx.db);
			const hasExistingEssentialData = !!essentialData;
			if (!hasExistingEssentialData) {
				throw new WRPCError("Judges' Room not found");
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
			broadcastDeviceListUpdate(ctx, session);

			return transaction(ctx.db, async (tx) => {
				return {
					essentialData: await getEssentialData(tx),
					teamData: await getTeamData(tx),
					judges: await getJudges(tx),
					finalAwardNominations: await getFinalAwardNominations(tx),
					authentication: ctx.auth.authentication
				};
			});
		}),

		createJudgesRoom: w.procedure
			.input(StarterKitSchema)
			.output(ClientAuthenticationSchema)
			.mutation(async ({ ctx, input, session }) => {
				const hasExistingEssentialData = await hasEssentialData(ctx.db);
				if (hasExistingEssentialData) {
					throw new WRPCError("Judges' Room already exists");
				}

				const judgeAdvisorAuthToken = generateAuthToken();

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

					await upsertJudgeAdvisorAuthToken(tx, judgeAdvisorAuthToken);
					const authentication = input.essentialData.accessControlEnabled
						? ({
								isAccessControlled: true,
								authToken: judgeAdvisorAuthToken,
								role: 'judge_advisor'
							} as const)
						: uncontrolledAuthentication;

					ctx.auth.setAuthentication(authentication);

					return authentication;
				});
			}),

		leaveJudgesRoom: w.procedure.mutation(async ({ ctx, session }) => {
			// Same as kickDevice for this device: close every socket (including the leaver) and
			// forget OfflineDevices. leaveJudgesRoom is the self-service path (no JA check).
			await ctx.network.kickDevice(session.currentClient.deviceId);
			broadcastDeviceListUpdate(ctx, session);
		}),

		destroyJudgesRoom: w.procedure.mutation(async ({ ctx }) => {
			if (await ctx.network.isAccessControlEnabled()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			await ctx.network.destroy();

			return { success: true, message: "Judges' Room destroyed" };
		})
	};
}
