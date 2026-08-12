---
type: Architecture
title: System interactions
description: How the API server, the Neon Postgres database, and external systems (the WhatsApp Cloud API) interact today.
tags: [architecture]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Overview

```mermaid
graph LR
  WA[WhatsApp Cloud API] -- "POST /webhook" --> API[TenisBot API]
  API -- "GET /webhook (verify)" --> WA
  API -- "POST .../messages (sendText/sendFlow)" --> WA
  WA -- "POST /flow (encrypted, per screen)" --> API
  API -- "upsert on every message" --> DB[(Postgres — Neon)]
  WEB[Admin dashboard — packages/web] -- "POST /auth/register, /auth/login, /auth/refresh, /auth/logout" --> API
  API -- "read/write clubs" --> DB
```

- The only external integration today is the WhatsApp Cloud API, used by
  [WhatsApp messaging](/features/whatsapp-messaging.md) for the webhook
  (inbound) and the Graph API (outbound replies), and by
  [the court-booking Flow](/features/court-booking-flow.md) for the
  separate encrypted `POST /flow` data-exchange endpoint that drives the
  day/slot/field booking screens (mock data — see
  [Database schema](/db-schema.md)).
- The database is Neon (serverless Postgres), reached over TLS via the
  singleton pool in `packages/api/src/config/db.ts` — see
  [the connection convention](../conventions/config/db-connection.md).
  Tables: `contacts`, upserted on every inbound WhatsApp message to detect
  new conversations, and `clubs`, one row per admin-dashboard tenant,
  read/written by the auth module. See [Database schema](/db-schema.md).
- `packages/web` is a Vite/React admin dashboard (login/register,
  Reservations, Settings, a call-center booking search) — see
  [Admin dashboard](/features/admin-dashboard.md). Only auth
  (register/login/refresh/logout) calls the API, over plain HTTP/CORS, and
  is real, backed by the `clubs` table and JWTs. Reservations, Settings,
  and the booking search are generated entirely client-side (mock data);
  they no longer call the API at all (the backend's `reservations`/
  `settings` modules still exist but are unused by the frontend).

# Update policy

When a new feature adds an external integration, a new inbound/outbound
edge, or starts using the database, update the diagram and the bullet list
above in the same commit.
