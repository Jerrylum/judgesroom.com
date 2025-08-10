import { createBuilder, type ProcedureBuilder } from './procedure-builder';
import { createRouterFactory, mergeRouters, type AnyRouter, type MergeRouters, type RouterBuilder } from './router';
import { type RootConfig, type AnyRootTypes, type CreateRootTypes } from './root-config';
import { type UnsetMarker } from './utils';

export interface WRPCRootObject<
	TMeta extends object,
	TOptions extends RuntimeConfigOptions<TMeta>,
	TClientRouter extends AnyRouter = AnyRouter,
	$Root extends AnyRootTypes = CreateRootTypes<{
		meta: TMeta;
		context: Record<string, never>;
	}>
> {
	/**
	 * Your router config
	 * @internal
	 */
	_config: RootConfig<$Root>;

	/**
	 * Builder object for creating procedures
	 */
	procedure: ProcedureBuilder<TMeta, UnsetMarker, UnsetMarker, TClientRouter>;

	/**
	 * Create a router
	 */
	router: RouterBuilder<$Root>;

	/**
	 * Merge Routers
	 */
	mergeRouters: <TRouters extends AnyRouter[]>(...routerList: [...TRouters]) => MergeRouters<TRouters>;
}

/** @internal */
interface RuntimeConfigOptions<TMeta extends object> {
	/**
	 * Default meta to be applied to all procedures
	 */
	defaultMeta?: TMeta;
}

class WRPCBuilder<TMeta extends object> {
	/**
	 * Add a meta shape as a generic to the root object
	 */
	meta<TNewMeta extends object>() {
		return new WRPCBuilder<TNewMeta>();
	}

	/**
	 * Create the root object with client router type
	 */
	createServer<TClientRouter extends AnyRouter, TOptions extends RuntimeConfigOptions<TMeta> = Record<string, never>>(
		opts?: TOptions
	): WRPCRootObject<TMeta, TOptions, TClientRouter> {
		type $Root = CreateRootTypes<{
			meta: TMeta;
			context: Record<string, never>;
		}>;

		const config: RootConfig<$Root> = {
			meta: (opts?.defaultMeta || {}) as TMeta,
			$types: null as unknown as $Root
		};

		return {
			/**
			 * Your router config
			 * @internal
			 */
			_config: config,
			/**
			 * Builder object for creating procedures
			 */
			procedure: createBuilder<TMeta, TClientRouter>({}),
			/**
			 * Create a router
			 */
			router: createRouterFactory<$Root>(config),
			/**
			 * Merge Routers
			 */
			mergeRouters
		};
	}

	clientClient<TOptions extends RuntimeConfigOptions<TMeta> = Record<string, never>>(
		opts?: TOptions
	): WRPCRootObject<TMeta, TOptions, never> {
		type $Root = CreateRootTypes<{
			meta: TMeta;
			context: Record<string, never>;
		}>;

		const config: RootConfig<$Root> = {
			meta: (opts?.defaultMeta || {}) as TMeta,
			$types: null as unknown as $Root
		};

		return {
			_config: config,
			procedure: createBuilder<TMeta, never>({}),
			router: createRouterFactory<$Root>(config),
			mergeRouters
		};
	}
}

/**
 * Builder to initialize the WRPC root object - use this exactly once per backend
 */
export const initWRPC = new WRPCBuilder();
export type { WRPCBuilder };
