// This file is heavily inspired by the tRPC utils.ts file
// https://github.com/trpc/trpc/blob/main/packages/server/src/unstable-core-do-not-import/utils.ts

/** @internal */
export type UnsetMarker = 'unsetMarker' & {
	__brand: 'unsetMarker';
};
