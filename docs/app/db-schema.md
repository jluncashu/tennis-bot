---
type: Database Schema
title: Live database schema
description: Snapshot of the Drizzle tables actually defined in src/db/schema.ts. Currently empty — no tables have been added yet.
tags: [database, schema]
resource: packages/api/src/db/schema.ts
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Tables

None yet. `src/db/schema.ts` is an empty re-export barrel:

```ts
export {};
```

A Neon (serverless Postgres) connection is wired up
(`packages/api/src/config/db.ts`, via `DATABASE_URL`; see
[the connection convention](../conventions/config/db-connection.md)), but
no module owns a table yet — see
[the WhatsApp messaging feature](/features/whatsapp-messaging.md), which is
currently the only feature and does not touch the database.

Migrations run through Drizzle Kit
(`packages/api/drizzle.config.ts`): `npm run db:generate` to write a
migration from schema changes, `npm run db:migrate` to apply it.

# Update policy

When a module's `<name>.schema.ts` defines a table (see
[the schema file convention](../conventions/module-pattern/schema.md)) and
it's re-exported from `src/db/schema.ts`, add a `## <table>` section here
in the same commit:

```markdown
## widgets

Owned by: [widgets module](/features/widgets.md)

| Column       | Type      | Notes                     |
|--------------|-----------|---------------------------|
| id           | uuid      | primary key, default random |
| label        | text      | not null                  |
| created_at   | timestamp | default now               |

Relationships: none yet.
```

Keep this file describing tables **as they exist in the database today** —
not planned or proposed tables.
