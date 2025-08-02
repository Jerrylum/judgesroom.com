import { z } from 'zod';
import type {
	ProcedureBuilder,
	ProcedureDefinition,
	RouterDefinition,
	RouterRecord,
	MaybePromise,
	WRPCRequest,
	WRPCResponse,
	InferInput
} from './types';
import { WRPCError } from './types';

class ProcedureBuilderImpl<TInput = unknown> implements ProcedureBuilder<TInput> {
	private _input?: z.ZodType<TInput>;

	constructor(input?: z.ZodType<TInput>) {
		this._input = input;
	}

	input<TSchema extends z.ZodType>(schema: TSchema): ProcedureBuilder<InferInput<TSchema>> {
		return new ProcedureBuilderImpl(schema) as ProcedureBuilder<InferInput<TSchema>>;
	}

	query<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): ProcedureDefinition<TInput, TOutput, 'query'> {
		return {
			_def: {
				input: this._input,
				type: 'query',
				handler
			}
		};
	}

	mutation<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): ProcedureDefinition<TInput, TOutput, 'mutation'> {
		return {
			_def: {
				input: this._input,
				type: 'mutation',
				handler
			}
		};
	}

	subscribe<TOutput>(handler: (ctx: { input: TInput }) => MaybePromise<TOutput>): ProcedureDefinition<TInput, TOutput, 'subscription'> {
		return {
			_def: {
				input: this._input,
				type: 'subscription',
				handler
			}
		};
	}
}

export class wRPC {
	procedure: ProcedureBuilder = new ProcedureBuilderImpl();

	router<TRecord extends RouterRecord>(record: TRecord): RouterDefinition<TRecord> {
		return {
			_def: {
				record
			}
		};
	}

	/**
	 * Create a request handler for the router
	 */
	createHandler<TRouter extends RouterDefinition>(
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
				if (procedure._def.input) {
					try {
						validatedInput = procedure._def.input.parse(request.input);
					} catch (error) {
						throw new WRPCError(
							`Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
							'INPUT_VALIDATION_ERROR',
							error
						);
					}
				}

				// Execute the procedure
				const result = await procedure._def.handler({ input: validatedInput });

				return {
					id: request.id,
					result: {
						type: 'data',
						data: result
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
	 * Flatten nested router structure into a flat map of procedures
	 */
	private flattenProcedures(record: RouterRecord, path: string = ''): Record<string, ProcedureDefinition> {
		const procedures: Record<string, ProcedureDefinition> = {};

		for (const [key, value] of Object.entries(record)) {
			const currentPath = path ? `${path}.${key}` : key;

			if ('_def' in value && 'handler' in value._def) {
				// It's a procedure
				procedures[currentPath] = value as ProcedureDefinition;
			} else if ('_def' in value && 'record' in value._def) {
				// It's a nested router
				const nestedProcedures = this.flattenProcedures(value._def.record as RouterRecord, currentPath);
				Object.assign(procedures, nestedProcedures);
			} else {
				// It's a plain RouterRecord
				const nestedProcedures = this.flattenProcedures(value as RouterRecord, currentPath);
				Object.assign(procedures, nestedProcedures);
			}
		}

		return procedures;
	}

	/**
	 * Create a subscription handler for real-time features
	 */
	createSubscriptionHandler<TRouter extends RouterDefinition>(
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
				if (procedure._def.input) {
					try {
						validatedInput = procedure._def.input.parse(request.input);
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
				const result = await procedure._def.handler({ input: validatedInput });

				// For now, just emit the result once and complete
				// In a real implementation, this might be an async iterator or observable
				yield {
					id: request.id,
					result: {
						type: 'data',
						data: result
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
}
