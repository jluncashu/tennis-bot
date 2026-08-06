---
type: Convention
title: "Controller file: <name>.controller.ts"
description: Validates the request with Zod safeParse, calls the service, and sends the response — no business logic.
tags: [backend, api, module-pattern]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Rule

No business logic here — if you find yourself writing an if/else about
data, move it to the [service](service.md).

# Example

```ts
import { Request, Response } from "express";
import { getWidget, addWidget } from "./widgets.service";
import { createWidgetSchema } from "./widgets.schema";

export async function getWidgetController(req: Request, res: Response) {
  const widget = await getWidget(req.params.id);
  res.json(widget);
}

export async function createWidgetController(req: Request, res: Response) {
  const parsed = createWidgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const widget = await addWidget(parsed.data);
  res.status(201).json(widget);
}
```

Validates against the schema defined in [Schema](schema.md), calls the
[Service](service.md), and is wired to a URL by the [Router](router.md).
Thrown `HttpError`s propagate to the
[global error handler](/shared-utilities/error-middleware.md).
