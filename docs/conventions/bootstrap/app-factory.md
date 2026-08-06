---
type: Convention
title: Express app factory (app.ts)
description: Builds and configures the Express app — middleware and routers — without calling listen(); errorMiddleware is registered last.
tags: [backend, api, bootstrap]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth/auth.router";
import { errorMiddleware } from "./shared/middleware/error.middleware";
import { env } from "./config/env";

export const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);

// Must be last
app.use(errorMiddleware);
```

# Rules

- No `.listen()` call here — that belongs to
  [the server entrypoint](server-entrypoint.md).
- Every module's [router](/module-pattern/router.md) is mounted here.
- [`errorMiddleware`](/shared-utilities/error-middleware.md) is always the
  last `app.use()` call, after all routers.
- `cors` uses `credentials: true` and `env.CLIENT_URL` from
  [validated env](/config/env-validation.md) so the
  [refresh-token cookie](/auth/cookie-options.md) round-trips correctly.
