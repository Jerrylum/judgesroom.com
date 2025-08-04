import { z } from 'zod';
import { AnyProcedure, Procedure, ProcedureType } from './procedure';
import { AnyRouter, BuiltRouter } from './router';

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

// Message types for WebSocket communication
export interface WRPCRequest {
	id: string;
	type: ProcedureType;
	path: string;
	input: unknown;
}

export interface WRPCResponse {
	id: string;
	result?: {
		type: 'data' | 'error' | 'complete';
		data?: unknown;
		error?: {
			message: string;
			code?: string;
		};
	};
}


// Procedure context
export interface ProcedureContext {
	input: unknown;
	ws?: WebSocket;
	clientId?: string;
	sessionId?: string;
}

// Legacy builder types (now replaced by proper implementation)
// export interface ProcedureBuilder<TInput = unknown> {
// 	input<TSchema extends z.ZodType>(schema: TSchema): ProcedureBuilder<InferParser<TSchema>>;
// 	query<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): QueryProcedure<TInput, TOutput>;
// 	mutation<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): MutationProcedure<TInput, TOutput>;
// }

// Router types
// export interface RouterRecord {
// 	// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 	[key: string]: Procedure<any, any> | RouterRecord;
// }

// export interface RouterDefinition<TRecord extends RouterRecord = RouterRecord> {
// 	_def: {
// 		record: TRecord;
// 	};
// }

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

// export interface ClientProcedure<TInput, TOutput> {
// 	query: (input: TInput) => Promise<TOutput>;
// 	mutation: (input: TInput) => Promise<TOutput>;
// 	subscribe: (
// 		input: TInput,
// 		observer: {
// 			onData?: (data: TOutput) => void;
// 			onError?: (error: Error) => void;
// 			onComplete?: () => void;
// 		}
// 	) => () => void; // Returns unsubscribe function
// }

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
