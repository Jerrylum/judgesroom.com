import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/client';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';
import { EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { DeviceInfoSchema } from '@judging.jerryio/protocol/src/client';
import { app, subscriptions } from './app-page.svelte';
import { TeamDataSchema } from '@judging.jerryio/protocol/src/team';
import { JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import {
	AwardNominationSchema,
	AwardRankingsFullUpdateSchema,
	AwardRankingsPartialUpdateSchema,
	type AwardRankingsFullUpdate
} from '@judging.jerryio/protocol/src/rubric';
import { AwardNameSchema } from '@judging.jerryio/protocol/src/award';

// Initialize WRPC client with server router type
const w = initWRPC.createClient<ServerRouter>();

/**
 * Client router defines procedures that can be called by the server
 * These are the endpoints the server can invoke on this client
 */
const clientRouter = w.router({
	/**
	 * Server pushes essential data updates to client
	 */
	onEssentialDataUpdate: w.procedure.input(EssentialDataSchema).mutation(async ({ input }) => {
		console.log(`📊 Essential data updated:`, input);
		app.handleEssentialDataUpdate(input);
		return `Essential data updated`;
	}),

	/**
	 * Server pushes device list updates to client
	 */
	onDeviceListUpdate: w.procedure.input(z.array(DeviceInfoSchema)).mutation(async ({ input }) => {
		console.log(`📊 Device list updated:`, input);
		app.handleDeviceListUpdate(input);
	}),

	/**
	 * Server pushes team data updates to client
	 */
	onAllTeamDataUpdate: w.procedure.input(z.array(TeamDataSchema)).mutation(async ({ input }) => {
		console.log(`📊 Team data updated:`, input);
		app.handleAllTeamDataUpdate(input);
	}),

	/**
	 * Server pushes team data update to client
	 */
	onTeamDataUpdate: w.procedure.input(TeamDataSchema).mutation(async ({ input }) => {
		console.log(`📊 Team data updated:`, input);
		app.handleTeamDataUpdate(input);
	}),

	/**
	 * Server pushes judges updates to client
	 */
	onAllJudgesUpdate: w.procedure.input(z.array(JudgeSchema)).mutation(async ({ input }) => {
		console.log(`📊 Judges updated:`, input);
		app.handleAllJudgesUpdate(input);
	}),

	onAwardRankingsUpdate: w.procedure.input(AwardRankingsPartialUpdateSchema).mutation(async ({ input }) => {
		console.log(`📊 Award rankings partial updated:`, input);

		const awardRankings = subscriptions.allJudgeGroupsAwardRankings[input.judgeGroupId];

		if (input.judgeGroupId !== awardRankings?.judgeGroupId) {
			throw new Error('CRITICAL: Award rankings update for wrong judge group');
		}

		const index = awardRankings.judgedAwards.indexOf(input.awardName);
		if (index === -1) {
			throw new Error('CRITICAL: Award not found');
		}

		if (!awardRankings.rankings[input.teamId]) {
			awardRankings.rankings[input.teamId] = [];
		}

		awardRankings.rankings[input.teamId][index] = input.ranking;
	}),

	onReviewedTeamsUpdate: w.procedure.input(z.object({ judgeGroupId: z.string(), teamId: z.string() })).mutation(async ({ input }) => {
		console.log(`📊 Reviewed teams updated:`, input);

		const reviewedTeams = subscriptions.allJudgeGroupsReviewedTeams[input.judgeGroupId];

		if (!reviewedTeams) {
			throw new Error('CRITICAL: This judge group is not subscribed to');
		}

		reviewedTeams.push(input.teamId);
	}),

	onFinalAwardNominationsUpdate: w.procedure
		.input(z.object({ awardName: AwardNameSchema, nominations: z.array(AwardNominationSchema) }))
		.mutation(async ({ input }) => {
			console.log(`📊 Final award nominations updated:`, input);

			app.handleFinalAwardNominationsUpdate(input.awardName, input.nominations);
		})
});

export { clientRouter };

/**
 * Type definition for the client router
 * Used by server-side code to get type-safe client procedure calls
 */
export type ClientRouter = typeof clientRouter;
