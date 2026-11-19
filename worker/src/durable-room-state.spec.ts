import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { sqliteRoomWasInitialized, type SqliteSchemaReader } from './durable-room-state';

function reader(sqlite: Database.Database): SqliteSchemaReader {
	return {
		exec(query: string) {
			return { toArray: () => sqlite.prepare(query).all() as { name?: string }[] };
		}
	};
}

describe('sqliteRoomWasInitialized', () => {
	it('is false for an empty database', () => {
		const sqlite = new Database(':memory:');
		expect(sqliteRoomWasInitialized(reader(sqlite))).toBe(false);
		sqlite.close();
	});

	it('is false when Metadata exists but has never been migrated or filled', () => {
		const sqlite = new Database(':memory:');
		sqlite.exec('CREATE TABLE Metadata (eventName text)');
		expect(sqliteRoomWasInitialized(reader(sqlite))).toBe(false);
		sqlite.close();
	});

	it('is true once a room row exists', () => {
		const sqlite = new Database(':memory:');
		sqlite.exec("CREATE TABLE Metadata (eventName text); INSERT INTO Metadata (eventName) VALUES ('City')");
		expect(sqliteRoomWasInitialized(reader(sqlite))).toBe(true);
		sqlite.close();
	});

	it('is true after Drizzle has created its migration table, even with no room row', () => {
		const sqlite = new Database(':memory:');
		sqlite.exec('CREATE TABLE __drizzle_migrations (id integer primary key, hash text, created_at numeric)');
		expect(sqliteRoomWasInitialized(reader(sqlite))).toBe(true);
		sqlite.close();
	});
});
