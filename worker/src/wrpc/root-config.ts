/**
 * The initial generics that are used in the init function
 * @internal
 */
export interface RootTypes {
	meta: object;
	context: object;
}

/**
 * The WRPC root config
 * @internal
 */
export interface RootConfig<TTypes extends RootTypes> {
	/**
	 * The types that are used in the config
	 * @internal
	 */
	$types: TTypes;
	/**
	 * Meta data
	 */
	meta: TTypes['meta'];
}

/**
 * @internal
 */
export type CreateRootTypes<TGenerics extends RootTypes> = TGenerics;

export type AnyRootTypes = CreateRootTypes<{
	meta: object;
	context: object;
}>;
