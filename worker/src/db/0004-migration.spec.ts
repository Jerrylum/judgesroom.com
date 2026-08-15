import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AuthTokenSchema } from '@judgesroom.com/protocol/src/access';

const migrationsDir = path.join(__dirname, '../../drizzle/migrations');

function execMigration(sqlite: Database.Database, name: string) {
	const sql = readFileSync(path.join(migrationsDir, name), 'utf8');
	for (const statement of sql.split('--> statement-breakpoint')) {
		const trimmed = statement.trim();
		if (trimmed) sqlite.exec(trimmed);
	}
}

function migrateThrough0003(sqlite: Database.Database) {
	execMigration(sqlite, '0000_migration.sql');
	execMigration(sqlite, '0001_migration.sql');
	execMigration(sqlite, '0002_migration.sql');
	execMigration(sqlite, '0003_migration.sql');
}

describe('0004 access-control migration', () => {
	let sqlite: Database.Database;

	afterEach(() => {
		sqlite?.close();
	});

	it('backfills unique auth tokens for judges that already exist', () => {
		sqlite = new Database(':memory:');
		migrateThrough0003(sqlite);

		sqlite.exec(`INSERT INTO JudgeGroups (id, name) VALUES ('g1', 'Group 1')`);
		sqlite.exec(`
			INSERT INTO Judges (id, name, groupId) VALUES
				('550e8400-e29b-41d4-a716-446655440001', 'A', 'g1'),
				('550e8400-e29b-41d4-a716-446655440002', 'B', 'g1'),
				('550e8400-e29b-41d4-a716-446655440003', 'C', 'g1')
		`);

		execMigration(sqlite, '0004_migration.sql');

		const rows = sqlite.prepare('SELECT id, authToken FROM Judges ORDER BY id').all() as {
			id: string;
			authToken: string;
		}[];
		const tokens = rows.map((row) => row.authToken);

		expect(rows).toHaveLength(3);
		for (const token of tokens) {
			expect(AuthTokenSchema.safeParse(token).success).toBe(true);
		}
		expect(new Set(tokens).size).toBe(tokens.length);

		const duplicate = sqlite.prepare('INSERT INTO Judges (id, name, groupId, authToken) VALUES (?, ?, ?, ?)');
		expect(() =>
			duplicate.run('550e8400-e29b-41d4-a716-446655440004', 'D', 'g1', tokens[0])
		).toThrow();
	});

	it('succeeds on an empty Judges table', () => {
		sqlite = new Database(':memory:');
		migrateThrough0003(sqlite);
		sqlite.exec(`INSERT INTO Metadata (eventName, program, eventGradeLevel, judgingMethod, judgingStep)
			VALUES ('Event', 'VIQRC', 'MS Only', 'assigned', 'beginning')`);

		execMigration(sqlite, '0004_migration.sql');

		const judges = sqlite.prepare('SELECT COUNT(*) AS count FROM Judges').get() as { count: number };
		const advisors = sqlite.prepare('SELECT COUNT(*) AS count FROM JudgeAdvisors').get() as { count: number };
		const meta = sqlite.prepare('SELECT accessControlEnabled, updatedAt FROM Metadata').get() as {
			accessControlEnabled: number;
			updatedAt: number | null;
		};

		expect(judges.count).toBe(0);
		expect(advisors.count).toBe(0);
		expect(meta.accessControlEnabled).toBe(0);
		expect(meta.updatedAt).toBeNull();
	});
});
