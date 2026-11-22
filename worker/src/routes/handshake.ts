import { getEssentialData, hasEssentialData, updateEssentialData } from './essential';
import { WRPCError, type WRPCRootObject } from '@jerrylum/wrpc/server';
import { getTeamData, updateTeamData } from './team';
import { assertJudgeRosterSize, getJudges, upsertJudge } from './judge';
import { broadcastDeviceListUpdate } from './device';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { offlineDevices } from '../db/schema';
import { transaction } from '../utils';
import { getAwardNoWinners, getFinalAwardNominations } from './judging';
import { generateAuthToken, uncontrolledAuthentication, type ClientAuthentication } from '@judgesroom.com/protocol/src/access';
import { LeftJudgesRoomCloseReason } from '@judgesroom.com/protocol/src/room-id';
import { JoiningKitSchema, StarterKitSchema, type JoiningKit, type RoomState, type StarterKit } from '@judgesroom.com/protocol/src/room';
import { assertAuthenticatedJudgeAdvisor, upsertJudgeAdvisorAuthToken } from '../access/tokens';

export { JoiningKitSchema, StarterKitSchema, type JoiningKit, type RoomState, type StarterKit };
export { RoomStateSchema } from '@judgesroom.com/protocol/src/room';

export function buildHandshakeRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		joinJudgesRoom: w.procedure.output(JoiningKitSchema).mutation(async ({ ctx, session }) => {
			if (!(await hasEssentialData(ctx.db))) {
				throw new WRPCError("Judges' Room not found");
			}

			await ctx.limits.consumeWriteBudget(1);

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
					awardsWithNoWinner: await getAwardNoWinners(tx),
					authentication: ctx.auth.authentication
				};
			});
		}),

		leaveJudgesRoom: w.procedure.mutation(async ({ ctx, session }) => {
			await ctx.limits.consumeWriteBudget(1);
			// Same as kickDevice for this device: close every socket (including the leaver) and
			// forget OfflineDevices. leaveJudgesRoom is the self-service path (no JA check).
			// The calling socket gets a distinct close reason so it can skip the kick notice.
			await ctx.network.kickDevice(session.currentClient.deviceId, {
				clientId: session.currentClient.clientId,
				reason: LeftJudgesRoomCloseReason
			});
			broadcastDeviceListUpdate(ctx, session);
		}),

		destroyJudgesRoom: w.procedure.mutation(async ({ ctx }) => {
			if (await ctx.network.isAccessControlEnabled()) {
				assertAuthenticatedJudgeAdvisor(ctx.auth);
			}

			await ctx.limits.consumeWriteBudget(1);
			await ctx.network.destroy();

			return { success: true, message: "Judges' Room destroyed" };
		})
	};
}

/** Write a new room. The caller initializes the database first. The joining socket records the device. */
export async function createJudgesRoomRecord(db: DatabaseOrTransaction, input: StarterKit): Promise<ClientAuthentication> {
	if (await hasEssentialData(db)) {
		throw new Error("Judges' Room already exists");
	}

	assertJudgeRosterSize(input.judges.length);

	const judgeAdvisorAuthToken = generateAuthToken();

	return transaction(db, async (tx) => {
		await updateEssentialData(tx, input.essentialData);
		await Promise.all(input.teamData.map((team) => updateTeamData(tx, team)));
		await Promise.all(input.judges.map((judge) => upsertJudge(tx, judge)));
		await upsertJudgeAdvisorAuthToken(tx, judgeAdvisorAuthToken);

		return input.essentialData.accessControlEnabled
			? {
					isAccessControlled: true as const,
					authToken: judgeAdvisorAuthToken,
					role: 'judge_advisor' as const
				}
			: uncontrolledAuthentication;
	});
}
