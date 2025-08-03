import { z } from 'zod';
import { createBuilder, ProcedureBuilder, ProcedureResolver, ProcedureResolverOptions } from './procedure-builder';
import { AnyRouter, BuiltRouter, Router, RouterRecord } from './router';
import { RootConfig } from './root-config';
import { UnsetMarker } from './utils';
import { MaybePromise, WRPCRequest, WRPCResponse, WRPCError } from './types';

// Type for runtime procedure with implementation details
interface RuntimeProcedure {
	_def: {
		procedure: true;
		type: 'query' | 'mutation' | 'subscription';
		meta: unknown;
		_resolver: (opts: ProcedureResolverOptions<unknown>) => MaybePromise<unknown>;
		_inputSchemas?: z.ZodType<unknown>[];
		_outputSchema?: z.ZodType<unknown>;
	};
}

// Main WRPC class
export class WRPC<TConfig extends RootConfig = RootConfig> {
	private _config: TConfig;

	constructor(config?: TConfig) {
		this._config = config as TConfig;
	}

	/**
	 * Create a new procedure builder
	 */
	get procedure(): ProcedureBuilder<TConfig['meta'], UnsetMarker, UnsetMarker> {
		return createBuilder({});
	}

	/**
	 * Create a router from a record of procedures and nested routers
	 */
	router<TRecord extends RouterRecord>(record: TRecord): BuiltRouter<TConfig, TRecord> {
		const router: Router<TConfig, TRecord> = {
			_def: {
				_config: this._config,
				router: true,
				record: record,
			}
		};

		// Merge the record properties directly onto the router
		return Object.assign(router, record) as BuiltRouter<TConfig, TRecord>;
	}

	/**
	 * Create a request handler for the router
	 */
	createHandler<TRouter extends AnyRouter>(
		router: TRouter,
		options?: {
			onError?: (error: WRPCError, req: WRPCRequest) => void;
		}
	) {
		const procedures = this.flattenProcedures(router._def.record);

		return async (request: WRPCRequest): Promise<WRPCResponse> => {
			try {
				const procedure = procedures[request.path];
				if (!procedure) {
					throw new WRPCError(`Procedure not found: ${request.path}`, 'PROCEDURE_NOT_FOUND');
				}

				// Validate input if schema is provided
				let validatedInput = request.input;
				if (procedure._def._inputSchemas && procedure._def._inputSchemas.length > 0) {
					try {
						// Apply all input schemas in sequence
						for (const schema of procedure._def._inputSchemas) {
							validatedInput = schema.parse(validatedInput);
						}
					} catch (error) {
						throw new WRPCError(
							`Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
							'INPUT_VALIDATION_ERROR',
							error
						);
					}
				}

				// Execute the procedure
				const resolverOptions: ProcedureResolverOptions<unknown> = {
					input: validatedInput,
				};

				const result = await procedure._def._resolver(resolverOptions);

				// Validate output if schema is provided
				let validatedOutput = result;
				if (procedure._def._outputSchema) {
					try {
						validatedOutput = procedure._def._outputSchema.parse(result);
					} catch (error) {
						throw new WRPCError(
							`Output validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
							'OUTPUT_VALIDATION_ERROR',
							error
						);
					}
				}

				return {
					id: request.id,
					result: {
						type: 'data',
						data: validatedOutput
					}
				};
			} catch (error) {
				const wrpcError =
					error instanceof WRPCError
						? error
						: new WRPCError(error instanceof Error ? error.message : 'Unknown error occurred', 'INTERNAL_ERROR', error);

				options?.onError?.(wrpcError, request);

				return {
					id: request.id,
					result: {
						type: 'error',
						error: {
							message: wrpcError.message,
							code: wrpcError.code
						}
					}
				};
			}
		};
	}

	/**
	 * Create a subscription handler for real-time features
	 */
	createSubscriptionHandler<TRouter extends AnyRouter>(
		router: TRouter,
		options?: {
			onError?: (error: WRPCError, req: WRPCRequest) => void;
		}
	) {
		const procedures = this.flattenProcedures(router._def.record);

		return async function* (request: WRPCRequest): AsyncGenerator<WRPCResponse> {
			try {
				const procedure = procedures[request.path];
				if (!procedure) {
					yield {
						id: request.id,
						result: {
							type: 'error',
							error: {
								message: `Procedure not found: ${request.path}`,
								code: 'PROCEDURE_NOT_FOUND'
							}
						}
					};
					return;
				}

				if (procedure._def.type !== 'subscription') {
					yield {
						id: request.id,
						result: {
							type: 'error',
							error: {
								message: `Procedure ${request.path} is not a subscription`,
								code: 'INVALID_PROCEDURE_TYPE'
							}
						}
					};
					return;
				}

				// Validate input if schema is provided
				let validatedInput = request.input;
				if (procedure._def._inputSchemas && procedure._def._inputSchemas.length > 0) {
					try {
						// Apply all input schemas in sequence
						for (const schema of procedure._def._inputSchemas) {
							validatedInput = schema.parse(validatedInput);
						}
					} catch (error) {
						yield {
							id: request.id,
							result: {
								type: 'error',
								error: {
									message: `Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
									code: 'INPUT_VALIDATION_ERROR'
								}
							}
						};
						return;
					}
				}

				// Execute the subscription procedure
				const resolverOptions: ProcedureResolverOptions<unknown> = {
					input: validatedInput,
				};

				const result = await procedure._def._resolver(resolverOptions);

				// Validate output if schema is provided
				let validatedOutput = result;
				if (procedure._def._outputSchema) {
					try {
						validatedOutput = procedure._def._outputSchema.parse(result);
					} catch (error) {
						yield {
							id: request.id,
							result: {
								type: 'error',
								error: {
									message: `Output validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
									code: 'OUTPUT_VALIDATION_ERROR'
								}
							}
						};
						return;
					}
				}

				// For now, just emit the result once and complete
				// In a real implementation, this might be an async iterator or observable
				yield {
					id: request.id,
					result: {
						type: 'data',
						data: validatedOutput
					}
				};

				yield {
					id: request.id,
					result: {
						type: 'complete'
					}
				};
			} catch (error) {
				const wrpcError =
					error instanceof WRPCError
						? error
						: new WRPCError(error instanceof Error ? error.message : 'Unknown error occurred', 'INTERNAL_ERROR', error);

				options?.onError?.(wrpcError, request);

				yield {
					id: request.id,
					result: {
						type: 'error',
						error: {
							message: wrpcError.message,
							code: wrpcError.code
						}
					}
				};
			}
		};
	}

	/**
	 * Flatten nested router structure into a flat map of procedures
	 */
	private flattenProcedures(record: RouterRecord, path: string = ''): Record<string, RuntimeProcedure> {
		const procedures: Record<string, RuntimeProcedure> = {};

		for (const [key, value] of Object.entries(record)) {
			const currentPath = path ? `${path}.${key}` : key;

			if (value && typeof value === 'object' && '_def' in value) {
				if ('procedure' in value._def && value._def.procedure) {
					// It's a procedure
					procedures[currentPath] = value as RuntimeProcedure;
				} else if ('router' in value._def && value._def.router) {
					// It's a nested router
					const nestedProcedures = this.flattenProcedures(value._def.record as RouterRecord, currentPath);
					Object.assign(procedures, nestedProcedures);
				}
			} else if (value && typeof value === 'object') {
				// It's a plain RouterRecord
				const nestedProcedures = this.flattenProcedures(value as RouterRecord, currentPath);
				Object.assign(procedures, nestedProcedures);
			}
		}

		return procedures;
	}
}

// Export a default instance
export const wrpc = new WRPC();