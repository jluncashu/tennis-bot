---
type: Convention
title: Refresh token cookie options
description: The shared cookie configuration used when setting the refreshToken cookie — httpOnly, secure in production, sameSite strict, 7-day maxAge.
tags: [backend, api, auth]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Definition

```ts
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
  sameSite: "strict" as const,                    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,               // 7 days in ms
};
```

Applies to the `refreshToken` cookie described in
[token strategy](token-strategy.md).
