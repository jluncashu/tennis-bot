---
type: Convention
title: "Schema file: <name>.schema.ts"
description: Defines the Drizzle table and inferred types for entity-owning modules, or Zod-only request schemas for modules that don't own an entity.
tags: [backend, api, module-pattern]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# When this module owns the entity

Define the Drizzle table and inferred types here, and re-export the table
from `src/db/schema.ts` so Drizzle Kit can find it (see
[folder structure](/folder-structure.md)).

```ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const widgets = pgTable("widgets", {
  id:        uuid("id").primaryKey().defaultRandom(),
  label:     text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Widget    = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;
```

```ts
// src/db/schema.ts — add one line per module
export { widgets } from "../modules/widgets/widgets.schema";
```

# When this module does not own an entity

Put only Zod request schemas here. `auth` is the canonical example — it
imports the `restaurants` table rather than defining its own (see
[module pattern overview](index.md)).

```ts
import { z } from "zod";

export const createWidgetSchema = z.object({
  label: z.string().min(1).max(120),
});

export type CreateWidgetBody = z.infer<typeof createWidgetSchema>;
```

# Next

The [repository](repository.md) consumes the table and types defined here.
