---
type: Convention
title: Database connection (db.ts)
description: A single pg Pool wrapped in Drizzle, exported as a singleton from src/config/db.ts; TLS is always required since the database is a hosted Postgres provider (Neon).
tags: [backend, api, config, database]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
import * as schema from "../db/schema";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
```

# Rules

- `db` is a singleton — import it, don't construct a new `Pool` elsewhere.
- `ssl` is always required: the database is hosted (Neon), reachable only
  over TLS, in every environment including local dev. `rejectUnauthorized:
  false` avoids strict chain validation, which is fine since the endpoint
  is only ever the trusted `DATABASE_URL` from
  [validated env](env-validation.md), not user-supplied.
- Use the **pooled** connection string (Neon's `-pooler` host) in
  `DATABASE_URL` by default — it goes through PgBouncer and tolerates many
  short-lived connections. Switch to the direct (non-pooled) host only if
  a feature needs session-pinned behavior (`LISTEN`/`NOTIFY`, advisory
  locks, prepared statements held across requests).
- Schema changes go through Drizzle Kit, configured in
  `packages/api/drizzle.config.ts` (reads `DATABASE_URL` from the same
  validated env). `npm run db:generate` writes a migration into
  `src/db/migrations/`, `npm run db:migrate` applies it. `npm run db:push`
  syncs the schema directly without a migration file — fine for local
  prototyping, not for anything already deployed.

Consumed by every module's [repository](/module-pattern/repository.md).
When a module adds a table, update
[docs/app/db-schema.md](../../app/db-schema.md) in the same commit.
