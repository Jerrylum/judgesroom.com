// This file is heavily inspired by the tRPC procedure.ts file
// https://github.com/trpc/trpc/blob/main/packages/server/src/unstable-core-do-not-import/procedure.ts

export const procedureTypes = ['query', 'mutation', 'subscription'] as const;

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
	};
};

export type QueryProcedure<TDef extends BuiltProcedureDef> = Procedure<'query', TDef>;

export type MutationProcedure<TDef extends BuiltProcedureDef> = Procedure<'mutation', TDef>;

export type SubscriptionProcedure<TDef extends BuiltProcedureDef> = Procedure<'subscription', TDef>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyQueryProcedure = QueryProcedure<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMutationProcedure = MutationProcedure<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySubscriptionProcedure = SubscriptionProcedure<any>;

export type AnyProcedure = AnyQueryProcedure | AnyMutationProcedure | AnySubscriptionProcedure;

export type inferProcedureInput<TProcedure extends AnyProcedure> = undefined extends inferProcedureParams<TProcedure>['$types']['input']
	? void | inferProcedureParams<TProcedure>['$types']['input']
	: inferProcedureParams<TProcedure>['$types']['input'];

export type inferProcedureParams<TProcedure> = TProcedure extends AnyProcedure ? TProcedure['_def'] : never;
export type inferProcedureOutput<TProcedure> = inferProcedureParams<TProcedure>['$types']['output'];
