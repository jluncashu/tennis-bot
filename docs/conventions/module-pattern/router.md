---
type: Convention
title: "Router file: <name>.router.ts"
description: Maps URLs to controllers — nothing else — and is registered on the app in app.ts.
tags: [backend, api, module-pattern]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Example

```ts
import { Router } from "express";
import { getWidgetController, createWidgetController } from "./widgets.controller";

export const widgetsRouter = Router();

widgetsRouter.get("/:id", getWidgetController);
widgetsRouter.post("/",   createWidgetController);
```

# Registration

Register the router in [`app.ts`](/bootstrap/app-factory.md):

```ts
import { widgetsRouter } from "./modules/widgets/widgets.router";
app.use("/widgets", widgetsRouter);
```

Wires up the handlers defined in [Controller](controller.md). This is the
last file in the request-handling chain; see [Testing](testing.md) for how
the layers below it are unit tested.
