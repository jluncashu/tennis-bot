---
type: Convention
title: http-error.ts
description: Factory that creates an Error carrying an HTTP status, thrown by services and caught by the global error handler.
tags: [backend, api, shared-utilities]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
export interface HttpError extends Error {
  status: number;
}

export function httpError(status: number, message: string): HttpError {
  return Object.assign(new Error(message), { status });
}
```

# Usage

Thrown from [services](/module-pattern/service.md) — for example
`throw httpError(404, "Widget not found")` — and handled by the
[global error handler](error-middleware.md).
