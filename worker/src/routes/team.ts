import type { NotebookDevelopmentStatus, NotebookSubmissionMethod, TeamData } from '@judgesroom.com/protocol/src/team';
import {
	notebookDevelopmentStatusAfterLinkChange,
	notebookDevelopmentStatusAfterMethodChange,
	TeamDataSchema,
	trimNotebookLink
} from '@judgesroom.com/protocol/src/team';
import type { WRPCRootObject } from '@jerrylum/wrpc/server';
import { metadata, teams } from '../db/schema';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ClientRouter } from '../client-router';
import { transaction } from '../utils';

export async function getTeamData(db: DatabaseOrTransaction): Promise<TeamData[]> {
	return db
		.select({
			id: teams.id,
			notebookLink: teams.notebookLink,
			hasInnovateAwardSubmissionForm: teams.hasInnovateAwardSubmissionForm,
			notebookDevelopmentStatus: teams.notebookDevelopmentStatus,
			absent: teams.absent
		})
		.from(teams) as Promise<TeamData[]>;
}

export async function readNotebookSubmissionMethod(db: DatabaseOrTransaction): Promise<NotebookSubmissionMethod> {
	const [row] = await db.select({ notebookSubmissionMethod: metadata.notebookSubmissionMethod }).from(metadata).limit(1);
	return row?.notebookSubmissionMethod ?? 'digital';
}

function resolveTeamDataWrite(
	method: NotebookSubmissionMethod,
	existing: { notebookLink: string; notebookDevelopmentStatus: NotebookDevelopmentStatus } | undefined,
	teamData: TeamData
): TeamData {
	const notebookLink = trimNotebookLink(teamData.notebookLink);
	if (!existing) {
		return { ...teamData, notebookLink };
	}
	return {
		...teamData,
		notebookLink,
		notebookDevelopmentStatus: notebookDevelopmentStatusAfterLinkChange({
			method,
			previousLink: existing.notebookLink,
			previousStatus: existing.notebookDevelopmentStatus,
			nextLink: notebookLink,
			requestedStatus: teamData.notebookDevelopmentStatus
		})
	};
}

export async function updateTeamData(db: DatabaseOrTransaction, teamData: TeamData): Promise<TeamData> {
	const method = await readNotebookSubmissionMethod(db);
	const [existing] = await db
		.select({
			notebookLink: teams.notebookLink,
			notebookDevelopmentStatus: teams.notebookDevelopmentStatus
		})
		.from(teams)
		.where(eq(teams.id, teamData.id));
	const resolved = resolveTeamDataWrite(method, existing, teamData);
	await db.update(teams).set(resolved).where(eq(teams.id, resolved.id));
	return resolved;
}

export async function reconcileNotebookStatusesForMethodChange(
	db: DatabaseOrTransaction,
	previousMethod: NotebookSubmissionMethod,
	nextMethod: NotebookSubmissionMethod
): Promise<void> {
	if (previousMethod === nextMethod) return;
	const rows = await db
		.select({
			id: teams.id,
			notebookLink: teams.notebookLink,
			notebookDevelopmentStatus: teams.notebookDevelopmentStatus
		})
		.from(teams);
	for (const row of rows) {
		const notebookDevelopmentStatus = notebookDevelopmentStatusAfterMethodChange({
			previousMethod,
			nextMethod,
			notebookLink: row.notebookLink,
			status: row.notebookDevelopmentStatus
		});
		if (notebookDevelopmentStatus === row.notebookDevelopmentStatus) continue;
		await db.update(teams).set({ notebookDevelopmentStatus }).where(eq(teams.id, row.id));
	}
}

export function buildTeamRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		getTeamData: w.procedure.output(z.array(TeamDataSchema)).query(async ({ ctx }) => {
			await ctx.limits.consumeReadBudget(1);
			return getTeamData(ctx.db);
		}),
		updateTeamData: w.procedure.input(TeamDataSchema).mutation(async ({ ctx, input, session }) => {
			await ctx.limits.consumeWriteBudget(1);
			const stored = await updateTeamData(ctx.db, input);
			// Do not wait for the broadcast to complete
			session.broadcast<ClientRouter>().onTeamDataUpdate.notify(stored);
		}),
		updateAllTeamData: w.procedure.input(z.array(TeamDataSchema)).mutation(async ({ ctx, input, session }) => {
			await ctx.limits.consumeWriteBudget(Math.max(1, input.length));
			await transaction(ctx.db, async (tx) => {
				const method = await readNotebookSubmissionMethod(tx);
				const existingRows = await tx
					.select({
						id: teams.id,
						notebookLink: teams.notebookLink,
						notebookDevelopmentStatus: teams.notebookDevelopmentStatus
					})
					.from(teams);
				const existingById = new Map(existingRows.map((row) => [row.id, row]));
				for (const teamData of input) {
					const resolved = resolveTeamDataWrite(method, existingById.get(teamData.id), teamData);
					await tx.update(teams).set(resolved).where(eq(teams.id, resolved.id));
				}
			});
			// Do not wait for the broadcast to complete
			getTeamData(ctx.db).then((teamData) => {
				session.broadcast<ClientRouter>().onAllTeamDataUpdate.notify(teamData);
			});
		})
	};
}
