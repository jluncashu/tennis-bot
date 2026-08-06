---
type: Convention
title: Token strategy
description: accessToken lives in memory and is sent as a Bearer header; refreshToken lives in an httpOnly cookie and is never returned in a JSON body.
tags: [backend, api, auth]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Tokens

| Token        | Storage            | Lifetime   | Transport                  |
|--------------|--------------------|------------|-----------------------------|
| accessToken  | Zustand (memory)   | 15 minutes | Authorization: Bearer header |
| refreshToken | httpOnly cookie    | 7 days     | Automatic via browser      |

# Rules

- The `refreshToken` is **never** returned in the JSON body — only set as a
  cookie by the server, using [cookie options](cookie-options.md).
- The `accessToken` is **never** stored in localStorage — memory only,
  cleared on page refresh.
- On app load, the frontend calls `POST /auth/refresh` to restore the
  session from the cookie.
- Logout calls `POST /auth/logout` to clear the cookie on the server.
