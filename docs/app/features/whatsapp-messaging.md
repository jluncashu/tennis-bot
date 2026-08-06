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
  - If it's a reply-button tap (`type: "interactive"`,
    `interactive.type: "button_reply"`), it's dispatched by button id.
    Tapping **Rezerva teren** (`book_court`) currently gets a placeholder
    reply — there's no booking flow yet.
  - Any other message (plain text, or an unrecognized button id) gets the
    main menu resent: body text "Bună! Cu ce te pot ajuta?" plus a
    **Rezerva teren** reply button.
- Non-text/non-interactive or status-update payloads (no `messages[0]`)
  are ignored after the ack.

The old plain-text echo (`You said: ...`) is gone — every incoming message
now gets the button menu instead.

# Endpoints

| Method | Path       | Handler          |
|--------|------------|-------------------|
| GET    | `/webhook` | `verifyWebhook`   |
| POST   | `/webhook` | `receiveMessage`  |

# Code

- Router: `packages/api/src/routes/whatsapp.routes.ts`
- Controller: `packages/api/src/controllers/whatsapp.controller.ts`
- Service: `packages/api/src/services/whatsapp.service.ts` (`sendText`, `sendButtons` — both call the Graph API)

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
