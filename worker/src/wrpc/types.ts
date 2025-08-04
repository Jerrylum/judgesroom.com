import { z } from 'zod';
import type { AnyProcedure, Procedure, ProcedureType } from './procedure';
import type { AnyRouter, BuiltRouter } from './router';

/**
 * ================================
 * Useful utility types that doesn't have anything to do with tRPC in particular
 * ================================
 */

/**
 * @public
 */
export type Maybe<TType> = TType | null | undefined;

/**
 * @internal
 * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Simplify<TType> = TType extends any[] | Date ? TType : { [K in keyof TType]: TType[K] };

/**
 * @public
 */
export type Dict<TType> = Record<string, TType | undefined>;

/**
 * @public
 */
export type MaybePromise<TType> = Promise<TType> | TType;

export type InferParser<T> = T extends z.ZodType<infer U> ? U : never;

const _errorSymbol = Symbol();
export type ErrorSymbol = typeof _errorSymbol;
export type TypeError<TMessage extends string> = TMessage & {
	_: typeof _errorSymbol;
};

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
			type: z.enum(['data', 'error', 'complete']),
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

// Helper function to parse and validate WRPC messages
export function parseWRPCMessage(data: string): WRPCRequest | WRPCResponse {
	const parsed = JSON.parse(data);
	return WRPCMessageSchema.parse(parsed);
}

// Procedure context
export interface ProcedureContext {
	input: unknown;
	ws?: WebSocket;
	clientId?: string;
	sessionId?: string;
}

// Type inference helpers
export type inferRouterInputs<TRouter extends AnyRouter> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends Procedure<ProcedureType, infer TDef>
		? TDef['input']
		: TRouter['_def']['record'][K] extends AnyRouter
			? inferRouterInputs<TRouter['_def']['record'][K]>
			: never;
};

export type inferRouterOutputs<TRouter extends AnyRouter> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends Procedure<ProcedureType, infer TDef>
		? TDef['output']
		: TRouter['_def']['record'][K] extends AnyRouter
			? inferRouterOutputs<TRouter['_def']['record'][K]>
			: never;
};

// Client types
export type CreateClientOptions = {
	wsUrl: string;
	sessionId?: string;
	clientId?: string;
	deviceName?: string;
};

// Error types
export class WRPCError extends Error {
	constructor(
		message: string,
		public code?: string,
		public cause?: unknown
	) {
		super(message);
		this.name = 'WRPCError';
	}
}
