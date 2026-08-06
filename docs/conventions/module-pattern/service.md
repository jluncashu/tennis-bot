---
type: Convention
title: "Service file: <name>.service.ts"
description: Orchestrates repositories, applies business rules, and throws domain errors — never touches req or res.
tags: [backend, api, module-pattern]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Rules

- Import repositories by name — no class, no `this`.
- Never touches `req` or `res`; that belongs in the
  [controller](controller.md).
- Throws domain errors via [`httpError`](/shared-utilities/http-error.md)
  rather than returning error codes.

# Example

```ts
import { findWidgetById, createWidget } from "./widgets.repository";
import { httpError } from "../../shared/utils/http-error";
import type { CreateWidgetBody } from "./widgets.schema";

export async function getWidget(id: string) {
  const widget = await findWidgetById(id);
  if (!widget) throw httpError(404, "Widget not found");
  return widget;
}

export async function addWidget({ label }: CreateWidgetBody) {
  return createWidget({ label });
}
```

# Publishing WebSocket events

When a module needs to push an event after a DB write, the service imports
`broadcast` (or `send`) from the
[WebSocket registry](/websockets/registry.md) directly — there is no
coupling back to the WS server:

```ts
// inside widgets.service.ts
import { broadcast } from "../../shared/ws/ws.registry";

export async function addWidget({ label }: CreateWidgetBody) {
  const widget = await createWidget({ label });
  broadcast({ type: "widget:created", payload: widget });
  return widget;
}
```

This is the only function in the pattern that is exercised directly by
[unit tests](testing.md); the [controller](controller.md) calls it.
