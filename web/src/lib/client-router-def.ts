import { z } from 'zod';
import { initWRPC } from '@jerrylum/wrpc/client';
import { ClientAuthenticationSchema } from '@judgesroom.com/protocol/src/access';
import { DeviceInfoSchema } from '@judgesroom.com/protocol/src/client';
import { TeamDataSchema } from '@judgesroom.com/protocol/src/team';
import { JudgeSchema, ReassignTeamsUpdateSchema } from '@judgesroom.com/protocol/src/judging';
import { AwardNominationSchema, AwardRankingsPartialUpdateSchema, SubmissionCacheSchema } from '@judgesroom.com/protocol/src/rubric';
import { AwardNameSchema } from '@judgesroom.com/protocol/src/award';
import { TeamPhotoUpdateSchema } from '@judgesroom.com/protocol/src/media';
import { RoomStateSchema } from '@judgesroom.com/protocol/src/room';

/**
 * Single client-router shape (procedure names + inputs).
 * Handlers are wired in client-router.ts; the worker imports only the type.
 * Keep this free of Svelte app imports so worker `tsc` does not pull in the web graph.
 */
export type ClientRouterHandlers = {
	onEventSetupUpdate: (input: z.infer<typeof RoomStateSchema>) => void | Promise<void>;
	onDeviceListUpdate: (input: z.infer<typeof DeviceInfoSchema>[]) => void | Promise<void>;
	onClientAuthenticationChange: (input: z.infer<typeof ClientAuthenticationSchema>) => void | Promise<void>;
	onAllTeamDataUpdate: (input: z.infer<typeof TeamDataSchema>[]) => void | Promise<void>;
	onTeamDataUpdate: (input: z.infer<typeof TeamDataSchema>) => void | Promise<void>;
	onAllJudgesUpdate: (input: z.infer<typeof JudgeSchema>[]) => void | Promise<void>;
	onAwardRankingsUpdate: (input: z.infer<typeof AwardRankingsPartialUpdateSchema>) => void | Promise<void>;
	onReviewedTeamsUpdate: (input: { judgeGroupId: string; teamId: string }) => void | Promise<void>;
	onReassignTeams: (input: z.infer<typeof ReassignTeamsUpdateSchema>) => void | Promise<void>;
	onSubmissionCacheUpdate: (input: z.infer<typeof SubmissionCacheSchema>[]) => void | Promise<void>;
	onFinalAwardNominationsUpdate: (input: {
		awardName: z.infer<typeof AwardNameSchema>;
		nominations: z.infer<typeof AwardNominationSchema>[];
	}) => void | Promise<void>;
	onAwardDeliberationStarted: () => void | Promise<void>;
	onTeamPhotoUpdate: (input: z.infer<typeof TeamPhotoUpdateSchema>) => void | Promise<void>;
};

export function buildClientRouter(handlers: ClientRouterHandlers) {
	const w = initWRPC.createClient();
	return w.router({
		onEventSetupUpdate: w.procedure.input(RoomStateSchema).mutation(async ({ input }) => {
			await handlers.onEventSetupUpdate(input);
		}),
		onDeviceListUpdate: w.procedure.input(z.array(DeviceInfoSchema)).mutation(async ({ input }) => {
			await handlers.onDeviceListUpdate(input);
		}),
		onClientAuthenticationChange: w.procedure.input(ClientAuthenticationSchema).mutation(async ({ input }) => {
			await handlers.onClientAuthenticationChange(input);
		}),
		onAllTeamDataUpdate: w.procedure.input(z.array(TeamDataSchema)).mutation(async ({ input }) => {
			await handlers.onAllTeamDataUpdate(input);
		}),
		onTeamDataUpdate: w.procedure.input(TeamDataSchema).mutation(async ({ input }) => {
			await handlers.onTeamDataUpdate(input);
		}),
		onAllJudgesUpdate: w.procedure.input(z.array(JudgeSchema)).mutation(async ({ input }) => {
			await handlers.onAllJudgesUpdate(input);
		}),
		onAwardRankingsUpdate: w.procedure.input(AwardRankingsPartialUpdateSchema).mutation(async ({ input }) => {
			await handlers.onAwardRankingsUpdate(input);
		}),
		onReviewedTeamsUpdate: w.procedure.input(z.object({ judgeGroupId: z.string(), teamId: z.string() })).mutation(async ({ input }) => {
			await handlers.onReviewedTeamsUpdate(input);
		}),
		onReassignTeams: w.procedure.input(ReassignTeamsUpdateSchema).mutation(async ({ input }) => {
			await handlers.onReassignTeams(input);
		}),
		onSubmissionCacheUpdate: w.procedure.input(z.array(SubmissionCacheSchema)).mutation(async ({ input }) => {
			await handlers.onSubmissionCacheUpdate(input);
		}),
		onFinalAwardNominationsUpdate: w.procedure
			.input(z.object({ awardName: AwardNameSchema, nominations: z.array(AwardNominationSchema) }))
			.mutation(async ({ input }) => {
				await handlers.onFinalAwardNominationsUpdate(input);
			}),
		onAwardDeliberationStarted: w.procedure.mutation(async () => {
			await handlers.onAwardDeliberationStarted();
		}),
		onTeamPhotoUpdate: w.procedure.input(TeamPhotoUpdateSchema).mutation(async ({ input }) => {
			await handlers.onTeamPhotoUpdate(input);
		})
	});
}

export type ClientRouter = ReturnType<typeof buildClientRouter>;
