export interface SqliteSchemaReader {
	exec(query: string): { toArray(): ReadonlyArray<{ name?: string }> };
}

/**
 * True when this Durable Object has already created its SQLite schema or saved a room.
 * A brand-new id has neither, so the caller can avoid migrations, wrpc storage, and alarms.
 * An empty Metadata table still counts once Drizzle has migrated: that is an older probe
 * whose alarm must be able to start and delete it.
 */
export function sqliteRoomWasInitialized(sql: SqliteSchemaReader): boolean {
	const tables = sql
		.exec(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Metadata', '__drizzle_migrations')`)
		.toArray();
	const names = new Set(tables.map((table) => table.name));
	if (names.has('Metadata')) {
		const rows = sql.exec('SELECT 1 AS present FROM Metadata LIMIT 1').toArray();
		if (rows.length > 0) {
			return true;
		}
	}
	return names.has('__drizzle_migrations');
}
