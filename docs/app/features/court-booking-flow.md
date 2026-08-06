---
type: Feature
title: Court booking (WhatsApp Flow)
description: A 4-screen WhatsApp Flow — pick a day, a time slot, a field, then confirm — backed entirely by mock data until a real courts/reservations schema exists.
tags: [whatsapp, booking, flow]
resource: packages/api/src/modules/booking/booking.flow.ts
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Why a Flow, not buttons

WhatsApp's reply-button/list messages always post a new visible chat
bubble on every tap — there's no Telegram-style silent callback or
message editing. A WhatsApp Flow renders a native multi-screen form
*inside* the chat instead, so picking a day → time → field → confirming
feels like one form, not four back-and-forth messages. See
[WhatsApp messaging](whatsapp-messaging.md) for how it's triggered.

Because "today" and "which slots are free" change per request, this has
to be a **dynamic** (data-exchange) Flow — every screen transition calls
our own backend — not a static Flow with fixed, pre-baked screens.

# Screens

1. **DATE_SELECT** — radio list of the next 7 days starting today, plus
   "◀ Săptămâna trecută" / "Săptămâna următoare ▶" links that re-render
   the same screen with `week_offset ± 1` (never below 0).
2. **SLOT_SELECT** — radio list of the *available* hourly slots (08:00–22:00)
   for the chosen day.
3. **FIELD_SELECT** — radio list of the fields free for that slot.
4. **CONFIRM** — summary text, a form (name, phone, optional notes), and a
   "Confirmă rezervarea" button that terminates the Flow.

Only ids ever cross the wire (a `RadioButtonsGroup` only reports back the
selected id) — human-readable titles are always re-derived server-side
from the id in `booking.repository.ts`'s `formatDateTitle`/
`formatSlotTitle`/`formatFieldTitle`, not threaded through the client.

# Code

- `packages/api/src/modules/booking/booking.repository.ts` — mock date/
  slot/field generation, deterministic per id (same id always yields the
  same mock availability). **Replace this file's internals with real
  Drizzle queries once a courts/reservations schema exists** — its
  function signatures are already shaped like a repository so nothing
  above it (`booking.service.ts`, `booking.flow.ts`) should need to change.
- `packages/api/src/modules/booking/booking.service.ts` — thin wrapper
  used by both the controller (initial screen) and the flow router.
- `packages/api/src/modules/booking/booking.flow.ts` — `routeFlowAction`,
  the screen-transition logic called by the data-exchange endpoint.
- `packages/api/src/modules/booking/booking.flow.json` — the Flow's UI
  definition (screens, components, routing model). Uploaded to Meta as an
  asset; not read by the running app.
- `packages/api/src/shared/whatsapp-flow/flow-crypto.ts` — generic
  RSA-OAEP + AES-128-GCM encrypt/decrypt for
  [Meta's Flow Data Exchange protocol](https://developers.facebook.com/docs/whatsapp/flows/reference/flowsdataendpoint).
  Not booking-specific — reusable by any future Flow.
- `packages/api/src/controllers/whatsapp-flow.controller.ts` —
  `handleFlowDataExchange`, the `POST /flow` handler: decrypt → `routeFlowAction` → encrypt.
- Trigger message: `sendFlow` in `packages/api/src/services/whatsapp.service.ts`,
  called from `sendBookingFlow` in `whatsapp.controller.ts`.
- Completion: WhatsApp posts the final answers as a normal webhook message
  (`interactive.type: "nfm_reply"`), handled by `handleFlowCompletion` in
  `whatsapp.controller.ts` — parses `response_json`, logs it, and replies
  with a mock confirmation text. Nothing is persisted yet.

# Interactions

```
Customer          WhatsApp App              TenisBot API
   |  any message       |                        |
   |-------------------->|---- POST /webhook ---->| sendFlow (opens Flow UI)
   |                     |<--- interactive:flow --|
   |  picks a day        |                        |
   |-------------------->|-- POST /flow (enc) --->| routeFlowAction → SLOT_SELECT
   |                     |<---- encrypted ---------|
   |  ...repeats for slot, field...                |
   |  taps "Confirmă"    |                        |
   |-------------------->|---- POST /webhook ---->| handleFlowCompletion (mock reply)
```

`POST /flow` is a **separate endpoint** from `POST /webhook` — Meta calls
it directly (encrypted) for every screen transition except the final
"complete" action, which instead arrives as an ordinary webhook message.

# Setup (manual, one-time)

This can't be done from code — it requires your WhatsApp Business Account
(WABA) id and an access token with `whatsapp_business_management`
permission. Run these yourself; don't paste the token or private key into
chat.

1. **Generate the RSA keypair** used to encrypt Flow data-exchange traffic:
   ```sh
   openssl genrsa -out flow_private.pem 2048
   openssl rsa -in flow_private.pem -pubout -out flow_public.pem
   ```
2. **Set the business public key** on your phone number (Meta uses this
   to encrypt every data-exchange request to `POST /flow`):
   ```sh
   curl -X POST "https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/whatsapp_business_encryption" \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -F "business_public_key=$(cat flow_public.pem)"
   ```
3. **Create the flow**:
   ```sh
   curl -X POST "https://graph.facebook.com/v20.0/<WABA_ID>/flows" \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Rezervare Teren Tenis Tineretului",
       "categories": ["APPOINTMENT_BOOKING"],
       "endpoint_uri": "https://<your-render-domain>/flow"
     }'
   ```
   Note the returned `id` — that's `WHATSAPP_FLOW_ID`.
4. **Upload the Flow JSON asset**:
   ```sh
   curl -X POST "https://graph.facebook.com/v20.0/<FLOW_ID>/assets" \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -F "name=flow.json" \
     -F "asset_type=FLOW_JSON" \
     -F "file=@packages/api/src/modules/booking/booking.flow.json;type=application/json"
   ```
   Fix any validation errors it reports before continuing — the JSON in
   this repo is a best-effort first draft, not guaranteed to pass Meta's
   schema validation unchanged.
5. **Publish**:
   ```sh
   curl -X POST "https://graph.facebook.com/v20.0/<FLOW_ID>/publish" \
     -H "Authorization: Bearer <ACCESS_TOKEN>"
   ```
6. Put `WHATSAPP_FLOW_ID` (from step 3) and `WHATSAPP_FLOW_PRIVATE_KEY`
   (the contents of `flow_private.pem` from step 1, with real newlines
   swapped for literal `\n`) into `.env` locally and into Render's
   environment variables — see `.env.example`.

# Known gaps

- **Not verified against Meta's live API.** The Flow JSON schema and the
  encryption protocol were written from documented specs, not tested end
  to end against a real WABA — expect to fix validation errors during
  step 4 above and to debug the first few real data-exchange calls.
- Everything is mock data (`booking.repository.ts`) — no real
  availability, no persistence of confirmed bookings. See
  [Database schema](/db-schema.md).
- Date generation uses the server's local timezone, not explicitly
  Europe/Bucharest — fine for a mock, worth revisiting when this becomes
  real (a server deployed in a different timezone could show "today"
  incorrectly right around midnight).
- No `.test.ts` for the booking module — no test runner set up in this
  repo yet (same gap as the contacts module).
- `flow_token` is generated per trigger (`randomUUID()`) but never stored
  or checked — fine for now since there's nothing to correlate it against,
  but a real implementation would use it to detect stale/replayed flows.
