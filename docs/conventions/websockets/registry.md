---
type: Convention
title: WebSocket client registry
description: Maps connectionId to WebSocket, and exposes send/broadcast for pushing WsMessage envelopes to clients.
tags: [backend, api, websocket]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
// src/shared/ws/ws.registry.ts
import { WebSocket } from "ws";

const clients = new Map<string, WebSocket>();

export function register(id: string, socket: WebSocket) {
  clients.set(id, socket);
  socket.on("close", () => clients.delete(id));
}

export function send<T>(id: string, message: WsMessage<T>) {
  clients.get(id)?.send(JSON.stringify(message));
}

export function broadcast<T>(message: WsMessage<T>) {
  for (const socket of clients.values()) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}
```

`register` is called by the [handler dispatcher](handler-dispatcher.md) on
each new connection. `send`/`broadcast` take a
[`WsMessage`](message-envelope.md) and are imported directly by feature
services — see the "Publishing WebSocket events" section of
[the service file convention](/module-pattern/service.md) for how a module
pushes an event after a DB write, without coupling back to the WS server.
