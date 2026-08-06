---
type: Convention
title: "Repository file: <name>.repository.ts"
description: Pure DB access with no business logic — returns null instead of throwing when a row is not found.
tags: [backend, api, module-pattern]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Rules

- No business logic, no token signing, no throwing HTTP errors.
- Returns `null` instead of throwing when a row is not found — the
  [service](service.md) decides what a missing row means.

# Example

```ts
import { db } from "../../config/db";
import { widgets } from "./widgets.schema";
import { eq } from "drizzle-orm";
import type { Widget, NewWidget } from "./widgets.schema";

export async function findWidgetById(id: string): Promise<Widget | null> {
  const [row] = await db.select().from(widgets).where(eq(widgets.id, id)).limit(1);
  return row ?? null;
}

export async function createWidget(data: Pick<NewWidget, "label">): Promise<Widget> {
  const [row] = await db.insert(widgets).values(data).returning();
  return row;
}
```

Depends on the table and types from [Schema](schema.md). Consumed by the
[Service](service.md), and mocked wholesale in [Testing](testing.md).
