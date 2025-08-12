/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createBuilder } from './procedure-builder';
import type { Session } from './session';
import type { AnyRouter } from './router';

describe('Procedure Builder', () => {
	let mockSession: Session<AnyRouter>;

	beforeEach(() => {
		mockSession = {
			sessionId: 'test-session',
			currentClient: {
				clientId: 'test-client',
				deviceName: 'Test Device'
			},
			getClient: vi.fn(),
			broadcast: vi.fn(),
			getServer: vi.fn()
		} as unknown as Session<AnyRouter>;
	});

	describe('createBuilder', () => {
		it('should create a basic builder', () => {
			const builder = createBuilder();

			expect(builder._def).toEqual({
				procedure: true,
				inputs: []
			});
		});

		it('should create a builder with initial definition', () => {
			const builder = createBuilder({
				meta: { description: 'test procedure' }
			});

			expect(builder._def).toEqual({
				procedure: true,
				inputs: [],
				meta: { description: 'test procedure' }
			});
		});

		describe('input validation', () => {
			it('should add input schema', () => {
				const builder = createBuilder();
				const inputSchema = z.string();
				
				const builderWithInput = builder.input(inputSchema);

				expect(builderWithInput._def.inputs).toContain(inputSchema);
			});

			it('should chain multiple input schemas', () => {
				const builder = createBuilder();
				const schema1 = z.string();
				const schema2 = z.number();
				
				const builderWithInputs = builder.input(schema1).input(schema2);

				expect(builderWithInputs._def.inputs).toEqual([schema1, schema2]);
			});
		});

		describe('output validation', () => {
			it('should add output schema', () => {
				const builder = createBuilder();
				const outputSchema = z.object({ result: z.string() });
				
				const builderWithOutput = builder.output(outputSchema);

				expect(builderWithOutput._def.output).toBe(outputSchema);
			});

			it('should override previous output schema', () => {
				const builder = createBuilder();
				const schema1 = z.string();
				const schema2 = z.number();
				
				const builderWithOutput = builder.output(schema1).output(schema2);

				expect(builderWithOutput._def.output).toBe(schema2);
			});
		});

		describe('meta', () => {
			it('should add meta information', () => {
				const builder = createBuilder();
				const meta = { description: 'test', version: '1.0' };
				
				const builderWithMeta = builder.meta(meta);

				expect(builderWithMeta._def.meta).toEqual(meta);
			});

			it('should merge meta with existing meta', () => {
				const initialMeta = { description: 'initial' };
				const builder = createBuilder({ meta: initialMeta });
				const additionalMeta = { version: '1.0' };
				
				const builderWithMeta = builder.meta(additionalMeta);

				expect(builderWithMeta._def.meta).toEqual({
					description: 'initial',
					version: '1.0'
				});
			});
		});

		describe('query procedure', () => {
			it('should create a query procedure', async () => {
				const builder = createBuilder();
				const resolver = vi.fn().mockResolvedValue('query result');
				
				const procedure = builder.query(resolver);

				expect(procedure._def).toEqual(
					expect.objectContaining({
						procedure: true,
						type: 'query',
						_resolver: resolver,
						_inputSchemas: [],
						_outputSchema: undefined
					})
				);
			});

			it('should create a query procedure with input validation', async () => {
				const builder = createBuilder();
				const inputSchema = z.string();
				const resolver = vi.fn().mockResolvedValue('query result');
				
				const procedure = builder.input(inputSchema).query(resolver);

				// Test that the procedure can be called
				const result = await (procedure as any)({ input: 'test input', session: mockSession });

				expect(resolver).toHaveBeenCalledWith({
					input: 'test input',
					session: mockSession
				});
				expect(result).toBe('query result');
			});

			it('should validate input against schema', async () => {
				const builder = createBuilder();
				const inputSchema = z.string();
				const resolver = vi.fn().mockResolvedValue('query result');
				
				const procedure = builder.input(inputSchema).query(resolver);

				// Valid input should work
				await expect(
					(procedure as any)({ input: 'valid string', session: mockSession })
				).resolves.toBe('query result');

				// Invalid input should throw
				await expect(
					(procedure as any)({ input: 123, session: mockSession })
				).rejects.toThrow();
			});

			it('should validate output against schema', async () => {
				const builder = createBuilder();
				const outputSchema = z.string();
				const resolver = vi.fn().mockResolvedValue('valid output');
				
				const procedure = builder.output(outputSchema).query(resolver);

				// Valid output should work
				await expect(
					(procedure as any)({ input: undefined, session: mockSession })
				).resolves.toBe('valid output');

				// Invalid output should throw
				resolver.mockResolvedValue(123);
				await expect(
					(procedure as any)({ input: undefined, session: mockSession })
				).rejects.toThrow();
			});

			it('should handle multiple input schemas in sequence', async () => {
				const builder = createBuilder();
				const schema1 = z.string();
				const schema2 = z.string().min(5);
				const resolver = vi.fn().mockResolvedValue('result');
				
				const procedure = builder.input(schema1).input(schema2).query(resolver);

				// Should validate against both schemas
				await expect(
					(procedure as any)({ input: 'hello', session: mockSession })
				).resolves.toBe('result');

				// Should fail if any schema fails
				await expect(
					(procedure as any)({ input: 'hi', session: mockSession })
				).rejects.toThrow();
			});
		});

		describe('mutation procedure', () => {
			it('should create a mutation procedure', async () => {
				const builder = createBuilder();
				const resolver = vi.fn().mockResolvedValue('mutation result');
				
				const procedure = builder.mutation(resolver);

				expect(procedure._def).toEqual(
					expect.objectContaining({
						procedure: true,
						type: 'mutation',
						_resolver: resolver,
						_inputSchemas: [],
						_outputSchema: undefined
					})
				);
			});

			it('should create a mutation procedure with input and output validation', async () => {
				const builder = createBuilder();
				const inputSchema = z.object({ value: z.number() });
				const outputSchema = z.object({ success: z.boolean() });
				const resolver = vi.fn().mockResolvedValue({ success: true });
				
				const procedure = builder
					.input(inputSchema)
					.output(outputSchema)
					.mutation(resolver);

				const result = await (procedure as any)({ 
					input: { value: 42 }, 
					session: mockSession 
				});

				expect(resolver).toHaveBeenCalledWith({
					input: { value: 42 },
					session: mockSession
				});
				expect(result).toEqual({ success: true });
			});
		});

		describe('builder chaining', () => {
			it('should allow chaining input, output, meta in any order', () => {
				const builder = createBuilder();
				const inputSchema = z.string();
				const outputSchema = z.boolean();
				const meta = { description: 'test' };

				const procedure1 = builder
					.input(inputSchema)
					.output(outputSchema)
					.meta(meta)
					.query(vi.fn());

				const procedure2 = builder
					.meta(meta)
					.output(outputSchema)
					.input(inputSchema)
					.query(vi.fn());

				expect(procedure1._def.meta).toEqual(meta);
				expect(procedure1._def._inputSchemas).toContain(inputSchema);
				expect(procedure1._def._outputSchema).toBe(outputSchema);

				expect(procedure2._def.meta).toEqual(meta);
				expect(procedure2._def._inputSchemas).toContain(inputSchema);
				expect(procedure2._def._outputSchema).toBe(outputSchema);
			});

			it('should create new builder instances when chaining', () => {
				const builder = createBuilder();
				const inputSchema = z.string();

				const builderWithInput = builder.input(inputSchema);

				expect(builder).not.toBe(builderWithInput);
				expect(builder._def.inputs).toEqual([]);
				expect(builderWithInput._def.inputs).toEqual([inputSchema]);
			});
		});

		describe('error handling', () => {
			it('should handle resolver errors gracefully', async () => {
				const builder = createBuilder();
				const error = new Error('Resolver error');
				const resolver = vi.fn().mockRejectedValue(error);
				
				const procedure = builder.query(resolver);

				await expect(
					(procedure as any)({ input: undefined, session: mockSession })
				).rejects.toThrow('Resolver error');
			});

			it('should handle async resolvers', async () => {
				const builder = createBuilder();
				const resolver = vi.fn().mockImplementation(async ({ input }) => {
					await new Promise(resolve => setTimeout(resolve, 10));
					return `async result: ${input}`;
				});
				
				const procedure = builder.query(resolver);

				const result = await (procedure as any)({ input: 'test', session: mockSession });
				expect(result).toBe('async result: test');
			});
		});
	});
});