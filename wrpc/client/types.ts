import type { AnyProcedure } from '../server/procedure';
import type { AnyRouter } from '../server/router';

/**
 * Client-specific types for WRPC
 */

export type InputOutputFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export type InferClientType<TProcedure> = TProcedure extends {
	_def: { type: infer TType; $types: { input: infer TInput; output: infer TOutput } };
}
	? TType extends 'query'
		? { query: InputOutputFunction<TInput, TOutput> }
		: TType extends 'mutation'
			? { mutation: InputOutputFunction<TInput, TOutput> }
			: never
	: never;

export type WRPCClient<TRouter extends AnyRouter> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends AnyProcedure
		? InferClientType<TRouter['_def']['record'][K]>
		: TRouter['_def']['record'][K] extends AnyRouter
			? WRPCClient<TRouter['_def']['record'][K]>
			: never;
};

export interface ClientOptions {
	wsUrl: string;
	sessionId?: string;
	clientId?: string;
	deviceName?: string;
}

export interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}
