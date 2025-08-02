import { z } from 'zod';

// Core utility types
export type MaybePromise<T> = T | Promise<T>;
export type Dict<T> = Record<string, T>;
export type InferInput<T> = T extends z.ZodType<infer U> ? U : never;
export type InferOutput<T> = T extends (...args: unknown[]) => infer U ? Awaited<U> : T;

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

export interface WRPCSubscriptionMessage {
	id: string;
	type: 'subscription';
	path: string;
	result: {
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

export type ProcedureType = 'query' | 'mutation' | 'subscription';

// Procedure definition types
export interface ProcedureDefinition<TInput = unknown, TOutput = unknown, TType extends ProcedureType = ProcedureType> {
	_def: {
		input?: z.ZodType<TInput>;
		type: TType;
		handler: (ctx: { input: TInput }) => MaybePromise<TOutput>;
	};
}

// Builder types
export interface ProcedureBuilder<TInput = unknown> {
	input<TSchema extends z.ZodType>(schema: TSchema): ProcedureBuilder<InferInput<TSchema>>;
	query<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): ProcedureDefinition<TInput, TOutput, 'query'>;
	mutation<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): ProcedureDefinition<TInput, TOutput, 'mutation'>;
	subscribe<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): ProcedureDefinition<TInput, TOutput, 'subscription'>;
}

// Router types
export interface RouterRecord {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: ProcedureDefinition<any, any> | RouterRecord;
}

export interface RouterDefinition<TRecord extends RouterRecord = RouterRecord> {
	_def: {
		record: TRecord;
	};
}

// Type inference helpers
export type InferRouterInputs<TRouter extends RouterDefinition> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends ProcedureDefinition<infer TInput, unknown>
		? TInput
		: TRouter['_def']['record'][K] extends RouterDefinition
			? InferRouterInputs<TRouter['_def']['record'][K]>
			: never;
};

export type InferRouterOutputs<TRouter extends RouterDefinition> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends ProcedureDefinition<unknown, infer TOutput>
		? TOutput
		: TRouter['_def']['record'][K] extends RouterDefinition
			? InferRouterOutputs<TRouter['_def']['record'][K]>
			: never;
};

// Client types
export type CreateClientOptions = {
	wsUrl: string;
	sessionId?: string;
	clientId?: string;
	deviceName?: string;
};

export interface ClientProcedure<TInput, TOutput> {
	query: (input: TInput) => Promise<TOutput>;
	mutation: (input: TInput) => Promise<TOutput>;
	subscribe: (
		input: TInput,
		observer: {
			onData?: (data: TOutput) => void;
			onError?: (error: Error) => void;
			onComplete?: () => void;
		}
	) => () => void; // Returns unsubscribe function
}

export type InferClientType<TProcedure> =
	TProcedure extends ProcedureDefinition<infer TInput, infer TOutput>
		? TProcedure['_def']['type'] extends 'query'
			? { query: (input: TInput) => Promise<TOutput> }
			: TProcedure['_def']['type'] extends 'mutation'
				? { mutation: (input: TInput) => Promise<TOutput> }
				: TProcedure['_def']['type'] extends 'subscription'
					? {
							subscribe: (
								input: TInput,
								observer: { onData?: (data: TOutput) => void; onError?: (error: Error) => void; onComplete?: () => void }
							) => () => void;
						}
					: never
		: never;

export type InferClient<TRouter extends RouterDefinition> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends ProcedureDefinition<any, any>
		? InferClientType<TRouter['_def']['record'][K]>
		: TRouter['_def']['record'][K] extends RouterDefinition
			? InferClient<TRouter['_def']['record'][K]>
			: never;
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
