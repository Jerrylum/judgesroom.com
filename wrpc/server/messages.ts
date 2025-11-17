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
	result: z.discriminatedUnion('type', [
		z.object({
			type: z.literal('data'),
			data: z.unknown()
		}),
		z.object({
			type: z.literal('error'),
			error: z.object({
				message: z.string(),
				code: z.string().optional()
			})
		})
	])
});

export type WRPCResponse = InferParser<typeof WRPCResponseSchema>;

export const WRPCPingSchema = z.object({
	kind: z.literal('ping')
});

export type WRPCPing = InferParser<typeof WRPCPingSchema>;

export const WRPCPongSchema = z.object({
	kind: z.literal('pong')
});

export type WRPCPong = InferParser<typeof WRPCPongSchema>;

// Proper discriminated union using the 'kind' field

export const WRPCMessageSchema = z.discriminatedUnion('kind', [WRPCRequestSchema, WRPCResponseSchema, WRPCPingSchema, WRPCPongSchema]);
