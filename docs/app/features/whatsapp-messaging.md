---
type: Feature
title: WhatsApp messaging
description: Verifies the WhatsApp Cloud API webhook and, on every incoming message, triggers the court-booking WhatsApp Flow.
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
  message from `entry[0].changes[0].value.messages[0]`:
  - The sender's phone number is recorded via `registerIncomingMessage`
    (`packages/api/src/modules/contacts/contacts.service.ts`), which
    reports whether this counts as a **new conversation** — no prior row
    in the [contacts table](/db-schema.md), or `last_seen_at` more than
    24h ago (WhatsApp's own conversation-window boundary).
  - If it's the final submission of the booking flow (`type: "interactive"`,
    `interactive.type: "nfm_reply"`), it's handled by
    `handleFlowCompletion` — see
    [the court-booking flow feature](court-booking-flow.md).
  - Otherwise (plain text, or anything else): if it's a new conversation,
    sends a literal `"Intro"` text message first, then always triggers the
    booking flow (see [court-booking-flow.md](court-booking-flow.md)).
- Non-text/non-interactive or status-update payloads (no `messages[0]`)
  are ignored after the ack.

The old reply-button menu is gone — replaced by a WhatsApp Flow. See
[court-booking-flow.md](court-booking-flow.md) for the multi-screen
booking UI and its own endpoint (`POST /flow`).

# Endpoints

| Method | Path       | Handler                  |
|--------|------------|---------------------------|
| GET    | `/webhook` | `verifyWebhook`           |
| POST   | `/webhook` | `receiveMessage`          |
| POST   | `/flow`    | `handleFlowDataExchange` (see [court-booking-flow.md](court-booking-flow.md)) |

# Code

- Router: `packages/api/src/routes/whatsapp.routes.ts`
- Controller: `packages/api/src/controllers/whatsapp.controller.ts`
- Service: `packages/api/src/services/whatsapp.service.ts` (`sendText`, `sendFlow` — both call the Graph API)
- Also uses the [contacts module](/db-schema.md) (`packages/api/src/modules/contacts/`) to detect new conversations, and the [booking module](court-booking-flow.md) to trigger the Flow

This feature predates the [module pattern](../../conventions/module-pattern/index.md):
its files live in flat `controllers/`, `routes/`, `services/` directories
rather than `src/modules/whatsapp/`. Don't migrate it as a side effect of
unrelated work — only restructure it if asked to.

# Interactions

Outbound replies go through the WhatsApp Cloud Graph API
(`https://graph.facebook.com/v20.0/<phone-number-id>/messages`). See
[Architecture](/architecture.md) for the full picture. Every inbound
message upserts a row in the `contacts` table — see
[Database schema](/db-schema.md).

# Config

Requires `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_VERIFY_TOKEN`, and (for the booking flow) `WHATSAPP_FLOW_ID` +
`WHATSAPP_FLOW_PRIVATE_KEY`, validated in `packages/api/src/config/env.ts`.

# Known gaps

- The `contacts` module has no `.test.ts` — this repo doesn't have a test
  runner (vitest) set up yet, so it was skipped rather than added as a
  side effect of a feature.
- "Intro" is a literal placeholder message, not real copy.
- No error surfaced to the sender if `sendText`/`sendFlow` fails (only
  logged).
