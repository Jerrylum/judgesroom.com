import { InferParser, MaybePromise, Simplify, TypeError } from './types';
import { UnsetMarker } from './utils';
import { MutationProcedure, ProcedureType, QueryProcedure, SubscriptionProcedure } from './procedure';
import { z } from 'zod';

type IntersectIfDefined<TType, TWith> = TType extends UnsetMarker ? TWith : TWith extends UnsetMarker ? TType : Simplify<TType & TWith>;

type DefaultValue<TValue, TFallback> = TValue extends UnsetMarker ? TFallback : TValue;

type ProcedureBuilderDef<TMeta> = {
	procedure: true;
	inputs: z.ZodType<unknown>[];
	output?: z.ZodType<unknown>;
	meta?: TMeta;
	resolver?: ProcedureBuilderResolver;
	type?: ProcedureType;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcedureBuilderDef = ProcedureBuilderDef<any>;

/**
 * Procedure resolver options (what the `.query()`, `.mutation()`, and `.subscription()` functions receive)
 * @internal
 */
export interface ProcedureResolverOptions<
	TInput
	// TContext,
	// TContextOverridesIn,
	// _TMeta,
> {
	input: TInput extends UnsetMarker ? undefined : TInput;
	// ctx: Simplify<Overwrite<TContext, TContextOverridesIn>>;
	// /**
	//  * The AbortSignal of the request
	//  */
	// signal: AbortSignal | undefined;
}

/**
 * A procedure resolver
 */
type ProcedureResolver<TInput, TOutput> = (opts: ProcedureResolverOptions<TInput>) => MaybePromise<TOutput>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResolver = ProcedureResolver<any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyProcedureBuilder = ProcedureBuilder<any, any, any>;

export interface ProcedureBuilder<
	TMeta,
	TInput,
	TOutput
	// TContext,
> {
	input<TSchema extends z.ZodType>(
		schema: InferParser<TSchema> extends UnsetMarker
			? TSchema
			: InferParser<TSchema> extends TInput
				? TSchema
				: TypeError<`Input schema does not match the expected type`>
	): ProcedureBuilder<TMeta, TInput, TOutput>;

	output<TSchema extends z.ZodType>(
		schema: InferParser<TSchema> extends UnsetMarker
			? TSchema
			: InferParser<TSchema> extends TOutput
				? TSchema
				: TypeError<`Output schema does not match the expected type`>
	): ProcedureBuilder<TMeta, TInput, TOutput>;

	query<$Output>(resolver: ProcedureResolver<TInput, $Output>): QueryProcedure<{
		input: DefaultValue<TInput, void>;
		output: DefaultValue<TOutput, $Output>;
		meta: TMeta;
	}>;

	mutation<$Output>(resolver: ProcedureResolver<TInput, $Output>): MutationProcedure<{
		input: DefaultValue<TInput, void>;
		output: DefaultValue<TOutput, $Output>;
		meta: TMeta;
	}>;

	subscribe<$Output>(resolver: ProcedureResolver<TInput, $Output>): SubscriptionProcedure<{
		input: DefaultValue<TInput, void>;
		output: DefaultValue<TOutput, $Output>;
		meta: TMeta;
	}>;
}

type ProcedureBuilderResolver = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	opts: ProcedureResolverOptions<any>
) => Promise<unknown>;
