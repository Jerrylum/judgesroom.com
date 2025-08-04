import type { AnyProcedure, inferProcedureInput, inferProcedureOutput } from './procedure';
import type { RootConfig, RootTypes } from './root-config';

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

export type BuiltRouter<TRoot, TRecord extends RouterRecord> = Router<TRoot, TRecord> & TRecord;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRouter = Router<any, any>;

export interface RouterBuilder<TRoot extends RootTypes> {
	<TIn extends CreateRouterOptions>(_: TIn): BuiltRouter<TRoot, DecorateCreateRouterOptions<TIn>>;
}

/** @internal */
export type CreateRouterOptions = {
	[key: string]: AnyProcedure | AnyRouter | CreateRouterOptions;
};

/** @internal */
export type DecorateCreateRouterOptions<TRouterOptions extends CreateRouterOptions> = {
	[K in keyof TRouterOptions]: TRouterOptions[K] extends infer $Value
		? $Value extends AnyProcedure
			? $Value
			: $Value extends Router<RootTypes, infer TRecord>
				? TRecord
				: $Value extends CreateRouterOptions
					? DecorateCreateRouterOptions<$Value>
					: never
		: never;
};

/**
 * @internal
 */
export function createRouterFactory<TRoot extends RootTypes>(config: RootConfig<TRoot>) {
	function createRouterInner<TInput extends CreateRouterOptions>(input: TInput): BuiltRouter<TRoot, DecorateCreateRouterOptions<TInput>> {
		const procedures: Record<string, AnyProcedure> = {};

		function step(from: CreateRouterOptions, path: readonly string[] = []) {
			const aggregate: RouterRecord = {};
			for (const [key, item] of Object.entries(from ?? {})) {
				if (isRouter(item)) {
					aggregate[key] = step(item._def.record, [...path, key]);
					continue;
				}
				if (!isProcedure(item)) {
					// RouterRecord
					aggregate[key] = step(item, [...path, key]);
					continue;
				}

				const newPath = [...path, key].join('.');

				if (procedures[newPath]) {
					throw new Error(`Duplicate key: ${newPath}`);
				}

				procedures[newPath] = item;
				aggregate[key] = item;
			}

			return aggregate;
		}
		const record = step(input);

		const _def: AnyRouter['_def'] = {
			_config: config,
			router: true,
			record
		};

		const router = {
			...(record as object),
			_def
		} as BuiltRouter<TRoot, Record<string, never>>;
		return router as BuiltRouter<TRoot, DecorateCreateRouterOptions<TInput>>;
	}

	return createRouterInner;
}

function isProcedure(procedureOrRouter: unknown): procedureOrRouter is AnyProcedure {
	if (typeof procedureOrRouter !== 'function') {
		return false;
	}

	const fn = procedureOrRouter as unknown as AnyProcedure;
	return typeof fn._def === 'object' && fn._def?.procedure === true;
}

function isRouter(value: unknown): value is AnyRouter {
	return (
		typeof value === 'object' &&
		value !== null &&
		'_def' in value &&
		typeof value._def === 'object' &&
		value._def !== null &&
		'router' in value._def
	);
}

/** @internal */
export type MergeRouters<
	TRouters extends AnyRouter[],
	TRoot = TRouters[0]['_def']['_config'],
	TRecord extends RouterRecord = Record<string, never>
> = TRouters extends [infer Head extends AnyRouter, ...infer Tail extends AnyRouter[]]
	? MergeRouters<Tail, TRoot, Head['_def']['record'] & TRecord>
	: BuiltRouter<TRoot, TRecord>;

export function mergeRouters<TRouters extends AnyRouter[]>(...routerList: [...TRouters]): MergeRouters<TRouters> {
	const record = Object.assign({}, ...routerList.map((r) => r._def.record));

	const router = createRouterFactory(routerList[0]?._def._config)(record);

	return router as MergeRouters<TRouters>;
}
