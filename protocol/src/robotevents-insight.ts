import { z } from 'zod';
import { GradeSchema } from './award';

/** Opening a tab reuses a copy younger than this. Refresh ignores it. */
export const ROBOT_EVENTS_CACHE_FRESH_MS = 60_000;
/** A download that never reports back is idle again after this. */
export const ROBOT_EVENTS_CACHE_FETCH_MS = 20_000;

export const RobotEventsResourceSchema = z.enum(['teams', 'rankings', 'skills']);
export type RobotEventsResource = z.infer<typeof RobotEventsResourceSchema>;

export const EXCELLENCE_ROBOT_EVENTS_RESOURCES = ['teams', 'rankings', 'skills'] as const satisfies readonly RobotEventsResource[];
export const ATTENDANCE_ROBOT_EVENTS_RESOURCES = ['rankings'] as const satisfies readonly RobotEventsResource[];

export function robotEventsCacheTopic(resource: RobotEventsResource): string {
	return `robotEventsCache:${resource}`;
}

export const RobotEventsTeamSchema = z.object({
	number: z.string(),
	grade: GradeSchema.nullable()
});

export const RobotEventsRankingSchema = z.object({
	teamNumber: z.string(),
	divisionId: z.number(),
	rank: z.number()
});

export const RobotEventsSkillsSchema = z.object({
	teamNumber: z.string(),
	rank: z.number(),
	driverScore: z.number(),
	programmingScore: z.number(),
	overallScore: z.number()
});

export type RobotEventsTeam = z.infer<typeof RobotEventsTeamSchema>;
export type RobotEventsRanking = z.infer<typeof RobotEventsRankingSchema>;
export type RobotEventsSkills = z.infer<typeof RobotEventsSkillsSchema>;

export const RobotEventsCachePayloadSchema = z.object({
	teams: z.array(RobotEventsTeamSchema),
	rankings: z.array(RobotEventsRankingSchema),
	skills: z.array(RobotEventsSkillsSchema)
});

export type RobotEventsCachePayload = z.infer<typeof RobotEventsCachePayloadSchema>;

const payloadSchemaByResource = {
	teams: z.array(RobotEventsTeamSchema),
	rankings: z.array(RobotEventsRankingSchema),
	skills: z.array(RobotEventsSkillsSchema)
} as const;

export function parseRobotEventsResourcePayload<T extends RobotEventsResource>(resource: T, payload: unknown) {
	return payloadSchemaByResource[resource].safeParse(payload);
}

export const SubscribeRobotEventsCacheInputSchema = z.object({
	resources: z.array(RobotEventsResourceSchema).min(1),
	refresh: z.boolean()
});

export const UnsubscribeRobotEventsCacheInputSchema = z.object({
	resources: z.array(RobotEventsResourceSchema).min(1)
});

export const RobotEventsResourceStatusSchema = z.object({
	resource: RobotEventsResourceSchema,
	state: z.enum(['HIT', 'MISSED']),
	payload: z.unknown().optional(),
	fetchedAt: z.number().optional(),
	fetchingStarted: z.number().optional(),
	requireRefetch: z.boolean()
});

export type RobotEventsResourceStatus = z.infer<typeof RobotEventsResourceStatusSchema>;

export const SubscribeRobotEventsCacheResultSchema = z.array(RobotEventsResourceStatusSchema);

export const ProvideRobotEventsCacheInputSchema = z.discriminatedUnion('state', [
	z.object({
		state: z.literal('RESULT'),
		fetchedAt: z.number(),
		teams: z.array(RobotEventsTeamSchema).optional(),
		rankings: z.array(RobotEventsRankingSchema).optional(),
		skills: z.array(RobotEventsSkillsSchema).optional()
	}),
	z.object({
		state: z.literal('FETCH_FAILED'),
		resources: z.array(RobotEventsResourceSchema).min(1)
	})
]);

export type ProvideRobotEventsCacheInput = z.infer<typeof ProvideRobotEventsCacheInputSchema>;

export const RobotEventsCacheUpdateSchema = z.discriminatedUnion('state', [
	z.object({
		state: z.literal('FETCHING'),
		resource: RobotEventsResourceSchema,
		fetchingStarted: z.number(),
		payload: z.unknown().optional(),
		fetchedAt: z.number().optional()
	}),
	z.object({
		state: z.literal('RESULT'),
		resource: RobotEventsResourceSchema,
		payload: z.unknown(),
		fetchedAt: z.number()
	}),
	z.object({
		state: z.literal('FETCH_FAILED'),
		resource: RobotEventsResourceSchema
	})
]);

export type RobotEventsCacheUpdate = z.infer<typeof RobotEventsCacheUpdateSchema>;
