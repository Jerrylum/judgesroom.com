import { z } from 'zod';
import { initWRPC } from '@judging.jerryio/wrpc/client';
import type { ServerRouter } from '@judging.jerryio/worker/src/server-router';
import { EssentialDataSchema } from '@judging.jerryio/protocol/src/event';
import { DeviceInfoSchema } from '@judging.jerryio/protocol/src/client';
import { app, subscriptions } from './app-page.svelte';
import { TeamDataSchema } from '@judging.jerryio/protocol/src/team';
import { JudgeSchema } from '@judging.jerryio/protocol/src/judging';
import {
	AwardRankingsFullUpdateSchema,
	AwardRankingsPartialUpdateSchema,
	type AwardRankingsFullUpdate
} from '@judging.jerryio/protocol/src/rubric';

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

	// onAwardRankingsFullUpdate: w.procedure.input(AwardRankingsFullUpdateSchema).mutation(async ({ input }) => {
	// 	console.log(`📊 Award rankings full updated:`, input);
	// 	subscriptions.awardRankings = input;
	// }),

	onAwardRankingsUpdate: w.procedure.input(AwardRankingsPartialUpdateSchema).mutation(async ({ input }) => {
		console.log(`📊 Award rankings partial updated:`, input);

		const awardRankings = subscriptions.allJudgeGroupsAwardRankings[input.judgeGroupId];

		if (input.judgeGroupId !== awardRankings?.judgeGroupId) {
			throw new Error('Award rankings update for wrong judge group');
		}

		const index = awardRankings.judgedAwards.indexOf(input.awardName);
		if (index === -1) {
			throw new Error('Award not found');
		}

		awardRankings.rankings[input.teamId][index] = input.ranking;
	})
});

export { clientRouter };

/**
 * Type definition for the client router
 * Used by server-side code to get type-safe client procedure calls
 */
export type ClientRouter = typeof clientRouter;
