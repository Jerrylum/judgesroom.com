// This file is heavily inspired by the tRPC utils.ts file
// https://github.com/trpc/trpc/blob/main/packages/server/src/unstable-core-do-not-import/utils.ts

import type { WRPCRequest, WRPCResponse, WRPCPing, WRPCPong } from './messages';

import { WRPCMessageSchema } from './messages';

/** @internal */
export type UnsetMarker = 'unsetMarker' & {
	__brand: 'unsetMarker';
};

/** @internal */
// Helper function to parse and validate WRPC messages
export function parseWRPCMessage(data: string): WRPCRequest | WRPCResponse | WRPCPing | WRPCPong {
	const parsed = JSON.parse(data);
	return WRPCMessageSchema.parse(parsed);
}
