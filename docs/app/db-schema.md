---
type: Database Schema
title: Live database schema
description: Snapshot of the Drizzle tables actually defined in src/db/schema.ts.
tags: [database, schema]
resource: packages/api/src/db/schema.ts
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Tables

## contacts

Owned by: `packages/api/src/modules/contacts/` (used internally by [WhatsApp messaging](/features/whatsapp-messaging.md) — no HTTP surface of its own, so it skips the controller/router files in the [module pattern](../conventions/module-pattern/index.md)).

| Column         | Type      | Notes                                    |
|----------------|-----------|-------------------------------------------|
| phone          | text      | primary key — the WhatsApp `from` number  |
| first_seen_at  | timestamp | default now, set once on first insert     |
| last_seen_at   | timestamp | default now, updated on every inbound message |

Purpose: lets the WhatsApp webhook tell a brand-new/returning-after-a-gap
conversation (`last_seen_at` older than 24h, or no row) from an ongoing
one, to decide whether to send the "Intro" message.

Relationships: none yet.

A Neon (serverless Postgres) connection is wired up
(`packages/api/src/config/db.ts`, via `DATABASE_URL`; see
[the connection convention](../conventions/config/db-connection.md)).

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
