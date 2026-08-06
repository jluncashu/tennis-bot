---
type: Feature
title: WhatsApp messaging
description: Verifies the WhatsApp Cloud API webhook and echoes back the text of any incoming message.
tags: [whatsapp, messaging]
resource: packages/api/src/routes/whatsapp.routes.ts
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# What it does

- `GET /webhook` — Meta's verification handshake. Echoes back
  `hub.challenge` if `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`,
  otherwise `403`.
- `POST /webhook` — receives an incoming message event. Responds `200`
  immediately (Meta retries on timeout/non-2xx), then extracts the first
  message from `entry[0].changes[0].value.messages[0]` and, if present,
  replies with `You said: <text>` via the WhatsApp Graph API.
- Non-text or status-update payloads (no `messages[0]`) are ignored after
  the ack.

# Endpoints

| Method | Path       | Handler          |
|--------|------------|-------------------|
| GET    | `/webhook` | `verifyWebhook`   |
| POST   | `/webhook` | `receiveMessage`  |

# Code

- Router: `packages/api/src/routes/whatsapp.routes.ts`
- Controller: `packages/api/src/controllers/whatsapp.controller.ts`
- Service: `packages/api/src/services/whatsapp.service.ts` (`sendText`, calls the Graph API)

This feature predates the [module pattern](../../conventions/module-pattern/index.md):
its files live in flat `controllers/`, `routes/`, `services/` directories
rather than `src/modules/whatsapp/`. Don't migrate it as a side effect of
unrelated work — only restructure it if asked to.

# Interactions

Outbound replies go through the WhatsApp Cloud Graph API
(`https://graph.facebook.com/v20.0/<phone-number-id>/messages`). See
[Architecture](/architecture.md) for the full picture. No database tables
are read or written by this feature yet — see [Database schema](/db-schema.md).

# Config

Requires `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, and
`WHATSAPP_VERIFY_TOKEN`, validated in `packages/api/src/config/env.ts`.

# Known gaps

- Echo-only — no booking, scheduling, or persistence logic yet.
- No error surfaced to the sender if `sendText` fails (only logged).
