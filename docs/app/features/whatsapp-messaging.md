---
type: Feature
title: WhatsApp messaging
description: Verifies the WhatsApp Cloud API webhook and replies to any incoming message with a button menu (currently just "Rezerva teren").
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
  - If it's a reply-button tap (`type: "interactive"`,
    `interactive.type: "button_reply"`), it's dispatched by button id.
    Tapping **Rezerva teren** (`book_court`) currently gets a placeholder
    reply — there's no booking flow yet.
  - Otherwise (plain text, or an unrecognized button id): if it's a new
    conversation, sends a literal `"Intro"` text message first, then
    always resends the main menu (body text "Bună! Cu ce te pot ajuta?"
    plus the **Rezerva teren** reply button).
- Non-text/non-interactive or status-update payloads (no `messages[0]`)
  are ignored after the ack.

The old plain-text echo (`You said: ...`) is gone — every incoming message
now gets the button menu, with an "Intro" message prepended the first
time a customer messages (or returns after 24h+ of silence).

# Endpoints

| Method | Path       | Handler          |
|--------|------------|-------------------|
| GET    | `/webhook` | `verifyWebhook`   |
| POST   | `/webhook` | `receiveMessage`  |

# Code

- Router: `packages/api/src/routes/whatsapp.routes.ts`
- Controller: `packages/api/src/controllers/whatsapp.controller.ts`
- Service: `packages/api/src/services/whatsapp.service.ts` (`sendText`, `sendButtons` — both call the Graph API)
- Also uses the [contacts module](/db-schema.md) (`packages/api/src/modules/contacts/`) to detect new conversations

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

Requires `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, and
`WHATSAPP_VERIFY_TOKEN`, validated in `packages/api/src/config/env.ts`.

# Known gaps

- The `contacts` module has no `.test.ts` — this repo doesn't have a test
  runner (vitest) set up yet, so it was skipped rather than added as a
  side effect of this feature.
- "Intro" is a literal placeholder message, not real copy.
- "Rezerva teren" only sends a placeholder reply — no courts, availability,
  or reservation persistence exists yet (see [Database schema](/db-schema.md)).
  Building that is a separate, larger task (new table(s), availability
  logic, confirmation flow).
- The menu has one button. WhatsApp reply-button messages cap out at 3;
  if a 4th option is needed, switch `sendMainMenu` to a list message
  (`interactive.type: "list"`, up to 10 items) instead of adding a 4th
  button.
- No error surfaced to the sender if `sendText`/`sendButtons` fails (only
  logged).
