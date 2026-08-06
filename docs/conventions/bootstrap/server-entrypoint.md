---
type: Convention
title: Server entrypoint (index.ts)
description: The only file that calls app.listen(); loads dotenv, imports the app factory and validated env, then starts the HTTP (and WS) server.
tags: [backend, api, bootstrap]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
import "dotenv/config";
import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Listening on :${env.PORT}`);
});
```

Uses the [Express app factory](app-factory.md) and
[validated env](/config/env-validation.md). When WebSockets are introduced,
the HTTP server created here is also where the WS upgrade handler from
[the handler dispatcher](/websockets/handler-dispatcher.md) attaches.
