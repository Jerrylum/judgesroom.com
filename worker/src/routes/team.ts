import type { TeamData } from '@judging.jerryio/protocol/src/team';
import { TeamDataSchema } from '@judging.jerryio/protocol/src/team';
import type { WRPCRootObject } from '@judging.jerryio/wrpc/server';
import { teams } from '../db/schema';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ClientRouter } from '@judging.jerryio/web/src/lib/client-router';
import { transaction } from '../utils';

export async function getTeamData(db: DatabaseOrTransaction): Promise<TeamData[]> {
	return db
		.select({
			id: teams.id,
			notebookLink: teams.notebookLink,
			notebookDevelopmentStatus: teams.notebookDevelopmentStatus,
			absent: teams.absent
		})
		.from(teams) as Promise<TeamData[]>;
}

export async function updateTeamData(db: DatabaseOrTransaction, teamData: TeamData): Promise<void> {
	await db.update(teams).set(teamData).where(eq(teams.id, teamData.id));
}

export function buildTeamRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getTeamData: w.procedure.output(z.array(TeamDataSchema)).query(async ({ ctx }) => {
			return getTeamData(ctx.db);
		}),
		updateTeamData: w.procedure.input(TeamDataSchema).mutation(async ({ ctx, input, session }) => {
			await updateTeamData(ctx.db, input);
			// Do not wait for the broadcast to complete
			session.broadcast<ClientRouter>().onTeamDataUpdate.mutation(input);
		}),
		updateAllTeamData: w.procedure.input(z.array(TeamDataSchema)).mutation(async ({ ctx, input, session }) => {
			await transaction(ctx.db, async (tx) => {
				for (const teamData of input) {
					await tx.update(teams).set(teamData).where(eq(teams.id, teamData.id));
				}
			});
			// Do not wait for the broadcast to complete
			getTeamData(ctx.db).then((teamData) => {
				session.broadcast<ClientRouter>().onAllTeamDataUpdate.mutation(teamData);
			});
		})
	};
}
