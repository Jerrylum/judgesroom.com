---
name: drizzle-migrations
description: Generate and register judgesroom.com Drizzle migrations for Durable Object SQLite. Use when changing worker/src/db/schema.ts, running bun run db:generate, adding or deleting worker/drizzle/migrations/*.sql, or editing worker/drizzle/migrations/index.ts.
---

# Drizzle migrations

## Generate

From `worker/`:

```bash
bun run db:generate
```

Do not hand-write SQL. Drizzle owns `NNNN_migration.sql`, `meta/_journal.json`, and `meta/NNNN_snapshot.json`.

## Register in the DO bundle

`drizzle-kit` does not update `worker/drizzle/migrations/index.ts`. The Worker loads migrations from that file (`worker/src/index.ts` → `migrate(this.db, migrations)`).

After generate:

```ts
import m0005 from './0005_migration.sql';

export default {
	journal,
	migrations: {
		m0000,
		m0001,
		m0002,
		m0003,
		m0004,
		m0005
	}
};
```

If you delete a generated migration, remove its import and `migrations` entry.

## Check

Worker start fails with `Missing migration: NNNN_migration` when `index.ts` is stale. Tests use the SQL folder directly (`drizzle-orm/better-sqlite3/migrator`) and will not catch this.