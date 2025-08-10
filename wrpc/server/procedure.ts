// This file is heavily inspired by the tRPC procedure.ts file
// https://github.com/trpc/trpc/blob/main/packages/server/src/unstable-core-do-not-import/procedure.ts

import type { AnyRouter } from './router';
import type { Session } from './session';

// Different from tRPC, we don't have a subscription type
export const procedureTypes = ['query', 'mutation'] as const;

/**
 * @public
 */
export type ProcedureType = (typeof procedureTypes)[number];

interface BuiltProcedureDef {
	meta: unknown;
	input: unknown;
	output: unknown;
}

/**
 *
 * @internal
 */
export type Procedure<TType extends ProcedureType, TDef extends BuiltProcedureDef> = {
	_def: {
		procedure: true;
		/**
		 * These are just types, they can't be used at runtime
		 * @internal
		 */
		$types: {
			input: TDef['input'];
			output: TDef['output'];
		};
		type: TType;
		meta: TDef['meta'];
		// Runtime properties for implementation
		_resolver?: (opts: { input: unknown; session: Session<AnyRouter> }) => Promise<unknown> | unknown;
		_inputSchemas?: unknown[];
		_outputSchema?: unknown;
	};
};

export type QueryProcedure<TDef extends BuiltProcedureDef> = Procedure<'query', TDef>;

export type MutationProcedure<TDef extends BuiltProcedureDef> = Procedure<'mutation', TDef>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyQueryProcedure = QueryProcedure<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMutationProcedure = MutationProcedure<any>;

export type AnyProcedure = AnyQueryProcedure | AnyMutationProcedure;

export type InferProcedureInput<TProcedure extends AnyProcedure> = undefined extends InferProcedureParams<TProcedure>['$types']['input']
	? void | InferProcedureParams<TProcedure>['$types']['input']
	: InferProcedureParams<TProcedure>['$types']['input'];

export type InferProcedureParams<TProcedure> = TProcedure extends AnyProcedure ? TProcedure['_def'] : never;
export type InferProcedureOutput<TProcedure> = InferProcedureParams<TProcedure>['$types']['output'];
