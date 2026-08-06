---
type: Convention
title: WebSocket handler dispatcher
description: Registers new connections and routes incoming WsMessage envelopes to per-type handlers, one central dispatcher shared by all modules.
tags: [backend, api, websocket]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
// src/shared/ws/ws.handler.ts
import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { register } from "./ws.registry";
import { randomUUID } from "crypto";
import type { WsMessage } from "./ws.types";

const handlers: Record<string, (payload: unknown, id: string) => void> = {
  // "widget:ping": widgetHandlers.ping,
};

export function handleConnection(socket: WebSocket, _req: IncomingMessage) {
  const id = randomUUID();
  register(id, socket);

  socket.on("message", (raw) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());
      const handler = handlers[msg.type];
      if (handler) {
        handler(msg.payload, id);
      } else {
        socket.send(JSON.stringify({ type: "error", payload: "Unknown message type" }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", payload: "Malformed message" }));
    }
  });
}
```

Uses [`register`](registry.md) from the client registry and parses the
[message envelope](message-envelope.md). Individual modules add entries to
`handlers` rather than opening their own WS server.
