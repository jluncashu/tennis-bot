---
type: Convention
title: WebSocket message envelope
description: Every WS message in and out uses the same { type, payload } shape, defined in src/shared/ws/ws.types.ts.
tags: [backend, api, websocket]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
// src/shared/ws/ws.types.ts
export interface WsMessage<T = unknown> {
  type: string;   // e.g. "widget:updated"
  payload: T;
}
```

Consumed by the [client registry](registry.md)'s `send`/`broadcast` and
parsed by the [handler dispatcher](handler-dispatcher.md).
