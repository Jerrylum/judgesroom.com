import { AnyProcedure, Procedure, ProcedureType } from './procedure';
import { AnyRouter } from './router';

export type InputOutputFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export type UnsubscribeFunction = () => void;

export type SubscriptionObserver<TOutput> = { onData?: (data: TOutput) => void; onError?: (error: Error) => void; onComplete?: () => void };

export type SubscriptionFunction<TInput, TOutput> = (input: TInput, observer: SubscriptionObserver<TOutput>) => UnsubscribeFunction;

export type InferClientType<TProcedure> =
	TProcedure extends Procedure<infer TType, infer TDef>
		? TType extends 'query'
			? { query: (input: TDef['input']) => Promise<TDef['output']> }
			: TType extends 'mutation'
				? { mutation: (input: TDef['input']) => Promise<TDef['output']> }
				: TType extends 'subscription'
					? {
							subscribe: (input: TDef['input'], observer: SubscriptionObserver<TDef['output']>) => UnsubscribeFunction;
						}
					: never
		: never;

export type InferClient<TRouter extends AnyRouter> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends AnyProcedure
		? InferClientType<TRouter['_def']['record'][K]>
		: TRouter['_def']['record'][K] extends AnyRouter
			? InferClient<TRouter['_def']['record'][K]>
			: never;
};
