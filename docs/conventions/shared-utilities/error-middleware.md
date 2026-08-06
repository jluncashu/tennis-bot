---
type: Convention
title: Global error handler (error.middleware.ts)
description: The single Express error handler, registered last in app.ts, that maps a thrown HttpError (or any Error) to a JSON response.
tags: [backend, api, shared-utilities]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

Register this **last** in [`app.ts`](/bootstrap/app-factory.md), after all
routers.

```ts
import { Request, Response, NextFunction } from "express";
import type { HttpError } from "../utils/http-error";

export function errorMiddleware(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status ?? 500;
  const message = status < 500 ? err.message : "Internal server error";
  res.status(status).json({ error: message });
}
```

# Rule

Errors below status 500 surface their own message (they're expected,
client-facing errors from [`httpError`](http-error.md)); 500-and-above
errors are masked as `"Internal server error"` to avoid leaking internals.
