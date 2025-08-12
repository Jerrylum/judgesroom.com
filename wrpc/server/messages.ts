import { z } from 'zod';
import type { InferParser } from './types';

// Zod schemas for runtime validation

export const WRPCRequestSchema = z.object({
	kind: z.literal('request'),
	id: z.string(),
	type: z.enum(['query', 'mutation']), // ProcedureType values
	path: z.string(),
	input: z.unknown()
});

export type WRPCRequest = InferParser<typeof WRPCRequestSchema>;

export const WRPCResponseSchema = z.object({
	kind: z.literal('response'),
	id: z.string(),
	result: z
		.object({
			type: z.enum(['data', 'error']),
			data: z.unknown().optional(),
			error: z
				.object({
					message: z.string(),
					code: z.string().optional()
				})
				.optional()
		})
		.optional()
});

export type WRPCResponse = InferParser<typeof WRPCResponseSchema>;
// Proper discriminated union using the 'kind' field

export const WRPCMessageSchema = z.discriminatedUnion('kind', [WRPCRequestSchema, WRPCResponseSchema]);
