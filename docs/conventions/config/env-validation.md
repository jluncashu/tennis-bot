---
type: Convention
title: Environment validation (env.ts)
description: process.env is validated once at startup with Zod; the process exits immediately on missing or wrong values so config problems surface in development, not production at 3 AM.
tags: [backend, api, config]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:     z.enum(["development", "test", "production"]).default("development"),
  PORT:         z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET:   z.string().min(32),
  CLIENT_URL:   z.string().url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
```

# Usage

Imported by [`index.ts`](/bootstrap/server-entrypoint.md) and
[`app.ts`](/bootstrap/app-factory.md) — never read `process.env` directly
elsewhere.
