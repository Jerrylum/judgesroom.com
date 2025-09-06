import { TeamData, TeamDataSchema } from '@judging.jerryio/protocol/src/team';
import { teams } from '../db/schema';
import { DatabaseOrTransaction, w } from '../server-router';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function getTeamData(db: DatabaseOrTransaction): Promise<TeamData[]> {
	return db.transaction(async (tx) => {
		return tx
			.select({
				id: teams.id,
				notebookLink: teams.notebookLink,
				excluded: teams.excluded
			})
			.from(teams) as Promise<TeamData[]>;
	});
}

export async function updateTeamData(db: DatabaseOrTransaction, teamData: TeamData): Promise<void> {
	return db.transaction(async (tx) => {
		await tx.update(teams).set(teamData).where(eq(teams.id, teamData.id));
	});
}

export const team = {
	getTeamData: w.procedure.output(z.array(TeamDataSchema)).query(async ({ ctx }) => {
		return getTeamData(ctx.db);
	}),
	updateTeamData: w.procedure.input(TeamDataSchema).mutation(async ({ ctx, input }) => {
		await updateTeamData(ctx.db, input);
		// Do not wait for the broadcast to complete
		// TODO: Broadcast to all clients: onTeamDataUpdate
	})
};
