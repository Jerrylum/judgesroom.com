// WRPC Client exports
export { createWRPCClient } from './client-factory';
export { WebsocketClient } from './websocket-client';
export { WRPCClientManager, createClientManager } from './client-manager';
export type { WRPCClient, ClientOptions, PendingRequest, InputOutputFunction, InferClientType } from './types';

// Re-export server types and utilities that clients need
export { type WRPCRootObject, initWRPC } from '../server/initWRPC';
export {
	type ProcedureType,
	type QueryProcedure,
	type MutationProcedure,
	type AnyQueryProcedure,
	type AnyMutationProcedure,
	type AnyProcedure
} from '../server/procedure';
export { type RootTypes, type RootConfig, type CreateRootTypes, type AnyRootTypes } from '../server/root-config';
export {
	type RouterRecord,
	type DecorateRouterRecord,
	type RouterDef,
	type Router,
	type BuiltRouter,
	type AnyRouter,
	type RouterBuilder,
	type CreateRouterOptions,
	type DecorateCreateRouterOptions
} from '../server/router';
export type { Session } from '../server/session';
