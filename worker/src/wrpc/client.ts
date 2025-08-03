export type InferClientType<TProcedure> =
	TProcedure extends Procedure<infer TInput, infer TOutput>
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

export type InferClient<TRouter extends AnyRouter> = {
	[K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends AnyProcedure
		? InferClientType<TRouter['_def']['record'][K]>
		: TRouter['_def']['record'][K] extends AnyRouter
			? InferClient<TRouter['_def']['record'][K]>
			: never;
};
