import { metadata, offlineClients } from '../db/schema';
import { w } from '../server-router';
import z from 'zod';
import { getEssentialData, hasEssentialData, updateEssentialData } from './essential';
import { EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { TeamDataSchema } from '@judging.jerryio/protocol/src/team';
import { JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import { type ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { getTeamData, updateTeamData } from './team';
import { getJudges, upsertJudge } from './judge';
import { eq } from 'drizzle-orm';

export const StarterKitSchema = z.object({
	essentialData: EssentialDataSchema,
	teamData: z.array(TeamDataSchema),
	judges: z.array(JudgeSchema)
});

export type StarterKit = z.infer<typeof StarterKitSchema>;

export const handshake = {
	joinSession: w.procedure.output(StarterKitSchema).mutation(async ({ ctx, session }) => {
		const offlineClient = {
			clientId: session.currentClient.clientId,
			deviceName: session.currentClient.deviceName,
			connectedAt: new Date()
		};

		// insert or update
		await ctx.db
			.insert(offlineClients)
			.values(offlineClient)
			.onConflictDoUpdate({
				target: [offlineClients.clientId],
				set: offlineClient
			});

		// TODO :broadcast to all listening clients
		// Do not wait for the broadcast to complete
		session.broadcast<ClientRouter>().onClientListUpdate.mutation([]);

		return ctx.db.transaction(async (tx) => {
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

			const offlineClient = {
				clientId: session.currentClient.clientId,
				deviceName: session.currentClient.deviceName,
				connectedAt: new Date()
			};

			// insert or update
			await ctx.db
				.insert(offlineClients)
				.values(offlineClient)
				.onConflictDoUpdate({
					target: [offlineClients.clientId],
					set: offlineClient
				});

			// TODO :broadcast to all listening clients
			// Do not wait for the broadcast to complete
			session.broadcast<ClientRouter>().onClientListUpdate.mutation([]);

			return ctx.db.transaction(async (tx) => {
				await updateEssentialData(tx, input.essentialData);

				await Promise.all(input.teamData.map((team) => updateTeamData(tx, team)));

				await Promise.all(input.judges.map((judge) => upsertJudge(tx, judge)));

				return { success: true, message: 'Session created' };
			});
		}),

	destroySession: w.procedure.mutation(async ({ ctx, session }) => {
		// TODO: Broadcast to all clients

		await ctx.destroySession();

		return { success: true, message: 'Session destroyed' };
	})
};
