import { z } from 'zod';
import { initWRPC } from '@judgesroom.com/wrpc/client';
import type { ServerRouter } from '@judgesroom.com/worker/src/server-router';
import { DeviceInfoSchema } from '@judgesroom.com/protocol/src/client';
import { app, subscriptions } from './index.svelte';
import { TeamDataSchema } from '@judgesroom.com/protocol/src/team';
import { JudgeSchema } from '@judgesroom.com/protocol/src/judging';
import { AwardNominationSchema, AwardRankingsPartialUpdateSchema, SubmissionCacheSchema } from '@judgesroom.com/protocol/src/rubric';
import { AwardNameSchema } from '@judgesroom.com/protocol/src/award';
import { JoiningKitSchema } from '@judgesroom.com/worker/src/routes/handshake';

// Initialize WRPC client with server router type
const w = initWRPC.createClient<ServerRouter>();

/**
 * Client router defines procedures that can be called by the server
 * These are the endpoints the server can invoke on this client
 */
const clientRouter = w.router({
	/**
	 * Server pushes event setup updates to client (this is just like joining the judges' room again)
	 */
	onEventSetupUpdate: w.procedure.input(JoiningKitSchema).mutation(async ({ input }) => {
		console.log(`📊 Event setup updated:`, input);
		app.handleEventSetupUpdate(input);
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

	onSubmissionCacheUpdate: w.procedure.input(SubmissionCacheSchema).mutation(async ({ input }) => {
		console.log(`📊 Submission cache updated:`, input);
		const uuid = input.tiId || input.enrId || input.tnId || 'null';
		subscriptions.allSubmissionCaches[uuid] = input;
	}),

	onFinalAwardNominationsUpdate: w.procedure
		.input(z.object({ awardName: AwardNameSchema, nominations: z.array(AwardNominationSchema) }))
		.mutation(async ({ input }) => {
			console.log(`📊 Final award nominations updated:`, input);

			app.handleFinalAwardNominationsUpdate(input.awardName, input.nominations);
		}),

	/**
	 * Server triggers when award deliberation starts
	 */
	onAwardDeliberationStarted: w.procedure.mutation(async () => {
		console.log(`🏆 Award deliberation started - opening award nomination tab`);

		const essData = app.getEssentialData();
		if (!essData) {
			throw new Error('CRITICAL: Essential data not found');
		}

		app.handleEssentialDataUpdate({ ...essData, judgingStep: 'award_deliberations' });
	})
});

export { clientRouter };

/**
 * Type definition for the client router
 * Used by server-side code to get type-safe client procedure calls
 */
export type ClientRouter = typeof clientRouter;
