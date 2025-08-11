import type { InferParser, MaybePromise, Simplify } from './types';
import type { UnsetMarker } from './utils';
import type { AnyMutationProcedure, AnyProcedure, AnyQueryProcedure, MutationProcedure, ProcedureType, QueryProcedure } from './procedure';
import type { Session } from './session';
import type { AnyRouter } from './router';
import type { z } from 'zod';

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
 * Procedure resolver options (what the `.query()` and `.mutation()` functions receive)
 * @internal
 */
export interface ProcedureResolverOptions<TInput, TServerRouter extends AnyRouter = AnyRouter> {
	input: TInput extends UnsetMarker ? undefined : TInput;
	/**
	 * Session for server-to-client communication
	 */
	session: Session<TServerRouter>;
}

/**
 * A procedure resolver
 */
export type ProcedureResolver<TInput, TOutput, TServerRouter extends AnyRouter = AnyRouter> = (
	opts: ProcedureResolverOptions<TInput, TServerRouter>
) => MaybePromise<TOutput>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResolver = ProcedureResolver<any, any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcedureBuilder = ProcedureBuilder<any, any, any, any>;

export interface ProcedureBuilder<TMeta, TInput, TOutput, TServerRouter extends AnyRouter = AnyRouter> {
	_def: ProcedureBuilderDef<TMeta>;

	input<TSchema extends z.ZodType>(
		schema: TSchema
	): ProcedureBuilder<TMeta, IntersectIfDefined<TInput, InferParser<TSchema>>, TOutput, TServerRouter>;

	output<TSchema extends z.ZodType>(
		schema: TSchema
	): ProcedureBuilder<TMeta, TInput, IntersectIfDefined<TOutput, InferParser<TSchema>>, TServerRouter>;

	meta(meta: TMeta): ProcedureBuilder<TMeta, TInput, TOutput, TServerRouter>;

	query<$Output>(resolver: ProcedureResolver<TInput, $Output, TServerRouter>): QueryProcedure<{
		input: DefaultValue<TInput, void>;
		output: DefaultValue<TOutput, $Output>;
		meta: TMeta;
	}>;

	mutation<$Output>(resolver: ProcedureResolver<TInput, $Output, TServerRouter>): MutationProcedure<{
		input: DefaultValue<TInput, void>;
		output: DefaultValue<TOutput, $Output>;
		meta: TMeta;
	}>;
}

type ProcedureBuilderResolver = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	opts: ProcedureResolverOptions<any, any>
) => Promise<unknown>;

function createNewBuilder(def1: AnyProcedureBuilderDef, def2: Partial<AnyProcedureBuilderDef>): AnyProcedureBuilder {
	const { inputs = [], meta, ...rest } = def2;

	return createBuilder({
		...def1,
		...rest,
		inputs: [...def1.inputs, ...inputs],
		meta: def1.meta && meta ? { ...def1.meta, ...meta } : (meta ?? def1.meta)
	});
}

function createResolver(_defIn: AnyProcedureBuilderDef & { type: ProcedureType }, resolver: AnyResolver): AnyProcedure {
	const _def: AnyProcedure['_def'] = {
		procedure: true,
		$types: null as unknown as { input: unknown; output: unknown },
		type: _defIn.type,
		meta: _defIn.meta,
		_resolver: resolver,
		_inputSchemas: _defIn.inputs,
		_outputSchema: _defIn.output
	};

	// Create a callable procedure function
	const procedure = async (opts: { input: unknown; session: Session<AnyRouter> }) => {
		// Validate input against schemas if they exist
		let validatedInput = opts.input;
		for (const inputSchema of _defIn.inputs) {
			validatedInput = inputSchema.parse(validatedInput);
		}

		// Call the resolver with validated input and session
		const result = await resolver({ input: validatedInput, session: opts.session });

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

export function createBuilder<TMeta, TServerRouter extends AnyRouter = AnyRouter>(
	initDef: Partial<AnyProcedureBuilderDef> = {}
): ProcedureBuilder<TMeta, UnsetMarker, UnsetMarker, TServerRouter> {
	const _def: AnyProcedureBuilderDef = {
		procedure: true,
		inputs: [],
		...initDef
	};

	const builder: AnyProcedureBuilder = {
		_def,

		input(inputSchema) {
			return createNewBuilder(_def, {
				inputs: [inputSchema]
			});
		},

		output(outputSchema) {
			return createNewBuilder(_def, {
				output: outputSchema
			});
		},

		meta(meta) {
			return createNewBuilder(_def, {
				meta
			});
		},

		query(resolver) {
			return createResolver({ ..._def, type: 'query' }, resolver) as AnyQueryProcedure;
		},

		mutation(resolver) {
			return createResolver({ ..._def, type: 'mutation' }, resolver) as AnyMutationProcedure;
		}
	};

	return builder;
}
