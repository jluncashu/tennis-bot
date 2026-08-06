---
type: Convention
title: Source tree layout
description: Top-level layout of src/ and what each top-level directory is responsible for.
tags: [backend, api, structure]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Layout

```
src/
├── index.ts                  ← Bootstrap: HTTP server (+ WS server when added)
├── app.ts                    ← Express app factory (no listen call)
│
├── config/
│   ├── env.ts                ← Zod-validated env (fails fast on bad config)
│   └── db.ts                 ← Drizzle instance via pg Pool (singleton)
│
├── modules/
│   └── <name>/                ← See the module pattern
│
├── shared/
│   ├── middleware/
│   │   ├── error.middleware.ts   ← Global Express error handler (register last)
│   │   └── request-id.middleware.ts
│   ├── ws/                   ← Add when WebSockets are introduced
│   │   ├── ws.types.ts       ← Shared message envelope types
│   │   ├── ws.registry.ts    ← Client map (connectionId → WebSocket)
│   │   └── ws.handler.ts     ← Route incoming WS messages to handlers
│   └── utils/
│       ├── http-error.ts     ← Factory: throw httpError(404, "Not found")
│       └── async-wrap.ts     ← Wraps async route handlers (optional)
│
├── db/
│   ├── schema.ts             ← Re-exports all table definitions (Drizzle Kit reads this)
│   └── migrations/           ← Drizzle Kit output
│
└── types/
    └── express.d.ts          ← Module augmentation for req.user etc.
```

# Rules

- Every feature lives in a self-contained folder under `src/modules/<name>/`.
  See [the module pattern](/module-pattern/) for the required files.
- `src/shared/` holds cross-module code only: middleware, WebSocket plumbing,
  and small utilities. See [shared utilities](/shared-utilities/) and
  [WebSocket conventions](/websockets/).
- `src/db/schema.ts` is a pure re-export barrel — the actual table
  definitions live in the owning module's `<name>.schema.ts`
  (see [the schema file](/module-pattern/schema.md)).
- `src/config/env.ts` is the single source of validated runtime config; see
  [environment validation](/config/env-validation.md).
- `src/index.ts` and `src/app.ts` are the two bootstrap files; see
  [bootstrap](/bootstrap/).
