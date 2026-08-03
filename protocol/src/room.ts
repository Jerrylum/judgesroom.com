import { z } from 'zod';
import { AwardNameSchema } from './award';
import { ClientAuthenticationSchema } from './access';
import { EssentialDataSchema } from './event';
import { JudgeSchema } from './judging';
import { AwardNominationSchema } from './rubric';
import { TeamDataSchema } from './team';

export const StarterKitSchema = z.object({
	essentialData: EssentialDataSchema,
	teamData: z.array(TeamDataSchema),
	judges: z.array(JudgeSchema)
});

export type StarterKit = z.infer<typeof StarterKitSchema>;

export const RoomStateSchema = z.object({
	essentialData: EssentialDataSchema,
	teamData: z.array(TeamDataSchema),
	judges: z.array(JudgeSchema),
	finalAwardNominations: z.record(AwardNameSchema, z.array(AwardNominationSchema))
});

export type RoomState = z.infer<typeof RoomStateSchema>;

export const JoiningKitSchema = RoomStateSchema.extend({
	authentication: ClientAuthenticationSchema
});

export type JoiningKit = z.infer<typeof JoiningKitSchema>;
