import { InferParser, MaybePromise, Simplify, TypeError } from './types';
import { UnsetMarker } from './utils';
import { AnyMutationProcedure, AnyProcedure, AnyQueryProcedure, MutationProcedure, ProcedureType, QueryProcedure, SubscriptionProcedure } from './procedure';
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
export type ProcedureResolver<TInput, TOutput> = (opts: ProcedureResolverOptions<TInput>) => MaybePromise<TOutput>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResolver = ProcedureResolver<any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcedureBuilder = ProcedureBuilder<any, any, any>;

export interface ProcedureBuilder<
	TMeta,
	TInput,
	TOutput
> {
	_def: ProcedureBuilderDef<TMeta>;

	input<TSchema extends z.ZodType>(
		schema: TSchema
	): ProcedureBuilder<TMeta, IntersectIfDefined<TInput, InferParser<TSchema>>, TOutput>;

	output<TSchema extends z.ZodType>(
		schema: TSchema
	): ProcedureBuilder<TMeta, TInput, IntersectIfDefined<TOutput, InferParser<TSchema>>>;

	meta(meta: TMeta): ProcedureBuilder<TMeta, TInput, TOutput>;

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

	// subscribe<$Output>(resolver: ProcedureResolver<TInput, $Output>): SubscriptionProcedure<{
	// 	input: DefaultValue<TInput, void>;
	// 	output: DefaultValue<TOutput, $Output>;
	// 	meta: TMeta;
	// }>;
}

type ProcedureBuilderResolver = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	opts: ProcedureResolverOptions<any>
) => Promise<unknown>;

function createNewBuilder(
	def1: AnyProcedureBuilderDef,
	def2: Partial<AnyProcedureBuilderDef>
): AnyProcedureBuilder {
	const { inputs = [], meta, ...rest } = def2;

	return createBuilder({
		...def1,
		...rest,
		inputs: [...def1.inputs, ...inputs],
		meta: def1.meta && meta ? { ...def1.meta, ...meta } : (meta ?? def1.meta),
	});
}

function createResolver(
	_defIn: AnyProcedureBuilderDef & { type: ProcedureType },
	resolver: AnyResolver
): AnyProcedure {
	const _def: AnyProcedure['_def'] = {
		procedure: true,
		$types: null as unknown as { input: unknown; output: unknown },
		type: _defIn.type,
		meta: _defIn.meta,
		_resolver: resolver,
		_inputSchemas: _defIn.inputs,
		_outputSchema: _defIn.output,
	};

	// Create a callable procedure function
	const procedure = async (opts: { input: unknown }) => {
		// Validate input against schemas if they exist
		let validatedInput = opts.input;
		for (const inputSchema of _defIn.inputs) {
			validatedInput = inputSchema.parse(validatedInput);
		}

		// Call the resolver with validated input
		const result = await resolver({ input: validatedInput });

		// Validate output if schema exists
		if (_defIn.output) {
			return _defIn.output.parse(result);
		}

		return result;
	};

	// Attach _def to make it a proper procedure
	procedure._def = _def;

	return procedure as AnyProcedure;
}

export function createBuilder<TMeta>(
	initDef: Partial<AnyProcedureBuilderDef> = {}
): ProcedureBuilder<TMeta, UnsetMarker, UnsetMarker> {
	const _def: AnyProcedureBuilderDef = {
		procedure: true,
		inputs: [],
		...initDef
	};

	const builder: AnyProcedureBuilder = {
		_def,

		input(inputSchema) {
			return createNewBuilder(_def, {
				inputs: [inputSchema],
			});
		},

		output(outputSchema) {
			return createNewBuilder(_def, {
				output: outputSchema,
			});
		},

		meta(meta) {
			return createNewBuilder(_def, {
				meta,
			});
		},

		query(resolver) {
			return createResolver(
				{ ..._def, type: 'query' },
				resolver
			) as AnyQueryProcedure;
		},

		mutation(resolver) {
			return createResolver(
				{ ..._def, type: 'mutation' },
				resolver
			) as AnyMutationProcedure;
		},
	};

	return builder;
}