/**
 * A wrpc failure on the server is a WRPCError. On the client it is a plain Error
 * with the server `code` copied on, and that code may be undefined.
 */
export function isWRPCError(error: unknown): error is Error & { code?: string } {
	return error instanceof Error && 'code' in error;
}
