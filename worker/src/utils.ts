import { DatabaseOrTransaction, Transaction } from './server-router';

/**
 * Runs a Drizzle transaction and reliably returns the callback's value.
 *
 * This function is a workaround to avoid the issue when using a transaction in
 * SQL for Durable Object, the return value is an empty object, regardless of
 * the return value of the callback.
 *
 * For example:
 * ```ts
 * const result = await db.transaction(async (tx) => {
 * 	return { message: 'not empty' };
 * });
 *
 * console.log(result); // { }
 * ```
 *
 * @template T The value returned by the transaction callback.
 * @param tx Database connection or transaction to run within.
 * @param fn Async function executed inside the transaction.
 * @returns Promise that resolves with the callback's return value after commit.
 *
 * @see https://github.com/drizzle-team/drizzle-orm/issues/4202
 * @see https://github.com/drizzle-team/drizzle-orm/issues/4322
 */
export function transaction<T>(tx: DatabaseOrTransaction, fn: (tx: Transaction) => Promise<T>) {
	const { promise, resolve, reject } = Promise.withResolvers<T>();

	(async function () {
		try {
			await tx.transaction(async (tx) => {
				resolve(await fn(tx));
			});
			// Do not put resolve here, it will be called before the transaction is committed
		} catch (error) {
			reject(error);
		}
	})();

	return promise;
}
