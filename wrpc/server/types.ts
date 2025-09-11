import type z from 'zod';
import type { AnyProcedure, Procedure, ProcedureType } from './procedure';
import type { AnyRouter, RouterRecord } from './router';
import type { WRPCRequest, WRPCResponse } from './messages';

/**
 * ================================
 * Useful utility types that doesn't have anything to do with tRPC in particular
 * ================================
 */

/**
 * @public
 */
export type Maybe<TType> = TType | null | undefined;

/**
 * @internal
 * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Simplify<TType> = TType extends any[] | Date ? TType : { [K in keyof TType]: TType[K] };

/**
 * @public
 */
export type Dict<TType> = Record<string, TType | undefined>;

/**
 * @public
 */
export type MaybePromise<TType> = Promise<TType> | TType;

export type InferParser<T> = T extends z.ZodType<infer U> ? U : never;

const _errorSymbol = Symbol();
export type ErrorSymbol = typeof _errorSymbol;
export type TypeError<TMessage extends string> = TMessage & {
	_: typeof _errorSymbol;
};

export type InferRouterContext<TRouter extends AnyRouter> = TRouter['_def']['_config']['context'];

// Client types
export type CreateClientOptions = {
	wsUrl: string;
	sessionId?: string;
	clientId?: string;
	deviceName?: string;
};

// Error types
export class WRPCError extends Error {
	constructor(
		message: string,
		public code?: string,
		public cause?: unknown
	) {
		super(message);
		this.name = 'WRPCError';
	}
}

export type InputOutputFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export type InferClientType<TProcedure> = TProcedure extends {
	_def: { type: infer TType; $types: { input: infer TInput; output: infer TOutput } };
}
	? TType extends 'query'
		? { query: InputOutputFunction<TInput, TOutput> }
		: TType extends 'mutation'
			? { mutation: InputOutputFunction<TInput, TOutput> }
			: never
	: never;

export type InferRouterType<TRecord extends RouterRecord> = {
	[K in keyof TRecord]: TRecord[K] extends AnyProcedure
		? InferClientType<TRecord[K]>
		: TRecord[K] extends RouterRecord
			? InferRouterType<TRecord[K]>
			: never;
};

/**
 * Client proxy type that mirrors the client router structure
 */
export type RouterProxy<TRouter extends AnyRouter> = InferRouterType<TRouter['_def']['record']>;

export type InputOutputBroadcastFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput[]>;

export type InferBroadcastClientType<TProcedure> = TProcedure extends {
	_def: { type: infer TType; $types: { input: infer TInput; output: infer TOutput } };
}
	? TType extends 'query'
		? { query: InputOutputBroadcastFunction<TInput, TOutput> }
		: TType extends 'mutation'
			? { mutation: InputOutputBroadcastFunction<TInput, TOutput> }
			: never
	: never;

export type InferRouterBroadcastType<TRecord extends RouterRecord> = {
	[K in keyof TRecord]: TRecord[K] extends AnyProcedure
		? InferBroadcastClientType<TRecord[K]>
		: TRecord[K] extends RouterRecord
			? InferRouterBroadcastType<TRecord[K]>
			: never;
};

/**
 * Client proxy type that mirrors the client router structure
 */
export type RouterBroadcastProxy<TRouter extends AnyRouter> = InferRouterBroadcastType<TRouter['_def']['record']>;

/**
 * Client data stored in Durable Object storage
 */
export interface ClientData {
	clientId: string;
	deviceId: string;
	deviceName?: string;
	connectedAt: number;
}

/**
 * Network interface
 */
export interface Network {
	/**
	 * Send a request to a specific client
	 */
	sendToClient(clientId: string, request: WRPCRequest): Promise<WRPCResponse>;

	/**
	 * Broadcast a request to all connected clients
	 */
	broadcast(request: WRPCRequest): Promise<WRPCResponse[]>;

	/**
	 * Get all connected client IDs
	 */
	getConnectedClients(): Readonly<string[]>;

	/**
	 * Check if a client is connected
	 */
	isClientConnected(clientId: string): boolean;

	/**
	 * Check if a device is connected
	 */
	isDeviceConnected(deviceId: string): boolean;

	/**
	 * Get all client data
	 */
	getAllClientData(): Readonly<Readonly<ClientData>[]>;

	/**
	 * Get client data by clientId
	 */
	getClientData(clientId: string): Readonly<ClientData> | null;

	/**
	 * Kick a client
	 */
	kickClient(clientId: string): Promise<void>;

	/**
	 * Destroy the network
	 */
	destroy(): Promise<void>;
}
