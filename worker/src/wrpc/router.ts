import { AnyProcedure, inferProcedureInput, inferProcedureOutput, Procedure } from './procedure';
import { RootConfig } from './root-config';

export interface RouterRecord {
	[key: string]: AnyProcedure | RouterRecord;
}

type DecorateProcedure<TProcedure extends AnyProcedure> = (
	input: inferProcedureInput<TProcedure>
) => Promise<inferProcedureOutput<TProcedure>>;

/**
 * @internal
 */
export type DecorateRouterRecord<TRecord extends RouterRecord> = {
	[TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
		? $Value extends AnyProcedure
			? DecorateProcedure<$Value>
			: $Value extends RouterRecord
				? DecorateRouterRecord<$Value>
				: never
		: never;
};

/**
 * @internal
 */
export interface RouterDef<TRoot, TRecord extends RouterRecord> {
	_config: TRoot;
	router: true;
	procedure?: never;
	record: TRecord;
}

export interface Router<TRoot, TRecord extends RouterRecord> {
	_def: RouterDef<TRoot, TRecord>;
}

export type BuiltRouter<TRoot extends RootConfig, TRecord extends RouterRecord> = Router<TRoot, TRecord> & TRecord;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRouter = Router<any, any>;
