---
type: Feature
title: Admin dashboard
description: A login-gated web dashboard (packages/web) for managing court Reservations (react-big-calendar week grid, all courts as sub-columns) and Settings, with real JWT-backed auth and two mock/in-memory data API modules.
tags: [web, admin, dashboard, reservations, settings, calendar, auth]
resource: packages/web/src/App.tsx
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-11T00:00:00Z }
---

# What it does

A single-page admin app in `packages/web` (Vite + React + TypeScript +
Tailwind + React Router), previously an empty placeholder. It gates access
behind a login/register page, then (once authenticated) shows
**Reservations** and **Settings**.

## Login (real auth)

`src/pages/LoginPage.tsx` is a combined login/register form (a `mode`
toggle between `"login"` and `"register"`, register additionally collecting
a club name) that calls the backend auth module
(`packages/api/src/modules/auth/`) through `src/api/auth.api.ts`
(`loginApi`, `registerApi`, both `POST /auth/{login,register}` via the
shared `src/api/api.ts` axios instance) and follows
[auth conventions](../../conventions/auth/index.md) exactly:
accessToken/refreshToken split, `POST /auth/refresh` on app load,
`POST /auth/logout` to clear the session. On success it stores
`{ club, accessToken }` in `src/store/auth.store.ts` (Zustand, in-memory
only) and navigates to `/reservations`.

`src/App.tsx` reads `accessToken` from the store directly to gate each
route (`/reservations`, `/settings` redirect to `/auth` when absent) rather
than through a wrapper component, and calls `refreshApi()` once on mount to
restore a session from the `refreshToken` cookie. Each club is a row in the
`clubs` table (see [Database schema](../db-schema.md)); `register` creates
one (`argon2` password hash), `login` verifies against it — self-serve
signup, not invite-only.

`src/components/DashboardLayout.tsx` has the sidebar nav and a working
"Log out" button (`logoutApi()` then clears the store and navigates to
`/auth`), but **isn't currently mounted by any route in `App.tsx`** —
`/reservations` and `/settings` render `ReservationsPage`/`SettingsPage`
directly, with no sidebar. This predates this login rework and is unrelated
to it; see Known gaps.

## Layout and pages

- `src/components/DashboardLayout.tsx` — left sidebar (Reservations,
  Settings, Log out) + `<Outlet/>` content area.
- `src/pages/ReservationsPage.tsx` — a
  [react-big-calendar](https://github.com/jquense/react-big-calendar)
  week-grid calendar showing **all courts at once**, each day column split
  into one sub-column per court (`resources` = `GET /api/settings`'s
  `courts` list, `resourceGroupingLayout` — day-major, resource-minor —
  so a day's courts sit side by side instead of the library's default of
  grouping every day under one resource column). There's no court picker;
  reservations for the visible week (`GET /api/reservations?weekOffset=`)
  are all rendered, positioned by `resourceId: court`.

  **Why react-big-calendar and not FullCalendar**: FullCalendar's
  equivalent (`@fullcalendar/resource-timegrid`) is FullCalendar
  *Premium* — tri-licensed (paid commercial license / non-commercial
  CC-BY-NC-ND trial / GPLv3), none of which fit a closed-source commercial
  booking product for free. react-big-calendar's resource view is plain
  MIT. Its day-major grouping landed in v1.16 (`resourceGroupingLayout`
  prop, boolean) — earlier versions only supported resource-major
  (grouping all 7 days under one resource column), which is why an older
  library version wouldn't have worked either.

  Custom "◀ Previous week / Today / Next week ▶" buttons
  (`toolbar={false}` hides react-big-calendar's own) drive a `weekOffset`
  state that both refetches the API and recomputes the controlled `date`
  prop (`onNavigate` is a no-op — this component, not the library, owns
  navigation). The grid's `min`/`max`/`step` come from Settings'
  `openHour`/`closeHour`/`slotDurationMinutes`, so changing business hours
  in Settings changes the calendar's visible range and row height. Events
  are color-coded by status (confirmed/pending/cancelled) via
  `eventPropGetter`, with a custom `components.event` renderer (name +
  status, no default time-range subtitle competing for space).

  Times render 24-hour EU-style (`08:00`, not `8am`) with day/month date
  order (`10/08`) via `dayjs.locale("en-gb")` (imported once at module
  scope) plus explicit `formats.timeGutterFormat`/`eventTimeRangeFormat`
  overrides — the rest of the UI stays English, only date/time formatting
  and (see below) week alignment change. CSS overrides in `src/index.css`
  (`.rbc-*` selectors, several needing `!important` since
  `react-big-calendar/lib/css/react-big-calendar.css` is imported inside
  `ReservationsPage.tsx` and can land after `index.css` in the bundle)
  give it a more polished look: refined grid-line/today-highlight colors,
  rounded shadowed event blocks, the library's built-in
  `.rbc-current-time-indicator` recolored to match.

  **Calendar weeks, not a rolling window**: unlike
  `booking.repository.ts`'s "today + N×7 days" pattern, both the frontend
  (`mondayOfWeek`) and backend (`mockReservationsForWeek`, see below)
  align `weekOffset` to real Monday–Sunday calendar weeks — required
  because react-big-calendar's Week view always renders a full calendar
  week for whatever `date` it's given (no custom-duration escape hatch
  like FullCalendar had), so the two had to agree on the same convention.
  The `en-gb` dayjs locale (`weekStart: 1`) makes the library's internal
  week-boundary math agree with this too.
- `src/pages/SettingsPage.tsx` — fetches `GET /api/settings` on mount, a
  form for opening hours, slot duration, courts, and price per slot;
  `PUT /api/settings` on save.
- `src/lib/api.ts` — small `fetch` wrapper (`apiGet`/`apiPut`) against
  `VITE_API_URL` (default `http://localhost:3000`), used by
  Reservations/Settings. Auth instead goes through the separate axios
  instance in `src/api/api.ts` (attaches the Bearer token from the store on
  every request) — see Login above.
- Routes (`src/App.tsx`): `/auth` (login/register, redirects to
  `/reservations` if already authenticated), `/reservations` + `/settings`
  (each individually gated on `accessToken`, redirecting to `/auth` when
  absent), `/` and unknown paths redirect to `/reservations`.

# Endpoints

`reservations` and `settings` are mock modules in `packages/api`, following
the [module pattern](../../conventions/module-pattern/index.md) with
Zod-only schemas (they don't own a DB entity — see the "does not own an
entity" case in [Schema](../../conventions/module-pattern/schema.md)).
`auth` is a real module backed by the `clubs` table (see
[Database schema](../db-schema.md)) — also schema-only from the module
pattern's perspective, since it doesn't define its own table (`clubs` lives
in a separate `clubs` module it reads/writes).

| Method | Path                | Handler                       |
|--------|---------------------|--------------------------------|
| POST   | `/auth/register`    | `registerController` — creates a `clubs` row, sets the `refreshToken` cookie, returns `{ accessToken, club }` |
| POST   | `/auth/login`       | `loginController` — verifies against `clubs.password_hash` (argon2), same response shape |
| POST   | `/auth/refresh`     | `refreshController` — reads the `refreshToken` cookie, rotates both tokens |
| POST   | `/auth/logout`      | `logoutController` — clears the `refreshToken` cookie |
| GET    | `/auth/me`          | `getMeController` — `requireAuth`-gated, returns the current club |
| GET    | `/api/reservations` | `listReservationsController` (`?date=YYYY-MM-DD` for one day, else `?weekOffset=N` for that Monday-Sunday calendar week) |
| GET    | `/api/settings`     | `getSettingsController`        |
| PUT    | `/api/settings`     | `updateSettingsController`     |

## Reservations

`packages/api/src/modules/reservations/reservations.repository.ts` —
deterministic mock data (same spirit as
[the court-booking Flow](court-booking-flow.md)'s mock repository): 2-4
reservations per day, seeded by a hash of the date so the same date always
yields the same list, walking a seeded LCG to avoid two reservations
colliding on the same court/hour. Courts are `"Teren 1"|"Teren 2"|"Teren 3"`,
matching the naming already used in `booking.repository.ts`. Status is one
of `"confirmed"|"pending"|"cancelled"`.

`mockReservationsForWeek(weekOffset)` finds the Monday of the current
calendar week (`mondayOf`), shifts it by `weekOffset * 7` days, then
generates that Monday-Sunday week's 7 days — **not** the "today +
weekOffset*7" rolling window `booking.repository.ts`'s `mockDatesForWeek`
uses. The two diverge on purpose: the WhatsApp flow's rolling window suits
a chat "next 7 days" feel, while the dashboard's calendar-week alignment
is required by react-big-calendar's Week view (see above) and is the more
standard mental model for an admin looking at "this week". `?date=` still
returns a single day regardless.

**Nothing here is connected to real bookings** — the WhatsApp booking
flows still don't persist anything (see Known gaps in
[court-booking-flow.md](court-booking-flow.md) and
[whatsapp-messaging.md](whatsapp-messaging.md)).

## Settings

`packages/api/src/modules/settings/settings.repository.ts` — a single
module-level mutable object (`openHour`, `closeHour`,
`slotDurationMinutes`, `courts: string[]`, `pricePerSlotRON`), seeded with
`{ 8, 22, 60, ["Teren 1","Teren 2","Teren 3"], 80 }`. `settings.service.ts`
validates `openHour < closeHour` (on top of the Zod bounds in
`settings.schema.ts`) and throws `httpError(400, ...)` otherwise.

# Enabling changes

These didn't exist before this feature despite being documented in
[shared utilities](../../conventions/shared-utilities/index.md):

- `packages/api/src/shared/utils/http-error.ts` and
  `packages/api/src/shared/middleware/error.middleware.ts` — added exactly
  as documented, registered last in `app.ts`.
- `cors` (new dependency) restricted to `env.CLIENT_URL` (new env var,
  default `http://localhost:5173`), so the Vite dev server can call the
  API cross-origin.
- `react-big-calendar` + `@types/react-big-calendar` + `dayjs` (new
  dependencies in `packages/web`) — see the licensing note above for why
  this was chosen over FullCalendar's resource view.

# Interactions

```
Browser (packages/web)              TenisBot API
   |  POST /auth/register/login --> |  auth.router -> clubs table (argon2)
   |  POST /auth/refresh --------> |  verify refreshToken cookie -> rotate tokens
   |  POST /auth/logout ---------> |  clear refreshToken cookie
   |  GET /api/reservations ----->|  reservations.router -> mock list
   |  GET /api/settings ---------> |  settings.router -> in-memory object
   |  PUT /api/settings ---------> |  validate -> update in-memory object
```

Auth is the only part of this feature that touches the database (the
`clubs` table); Reservations/Settings are still mock/in-memory — see Known
gaps.

# Config

- `packages/api`: `CLIENT_URL` (validated in `src/config/env.ts`, default
  `http://localhost:5173`); `JWT_SECRET` (min 32 chars, no default —
  required to sign/verify access + refresh tokens, see
  [token strategy](../../conventions/auth/token-strategy.md)).
- `packages/web`: `VITE_API_URL` (default `http://localhost:3000`, see
  `.env.example`).
- **Port 3000 conflicts are a real gotcha in dev.** `PORT` (api) defaults
  to `3000` per `.env.example`, but on a machine where something else
  (observed: a Docker Desktop container) already owns that port, requests
  can silently hit the other service instead of erroring — the dashboard
  just shows no data, no obvious error. If reservations/settings don't
  load, check what's actually listening on the configured `PORT` before
  assuming the app is broken; picking a free port for `PORT` in
  `packages/api/.env` and matching it in `packages/web/.env`'s
  `VITE_API_URL` resolves it. Both `.env` files are local/gitignored, not
  committed defaults.

# Known gaps

- **`DashboardLayout` isn't mounted.** `src/components/DashboardLayout.tsx`
  (sidebar nav + working logout) exists and is correct, but `App.tsx`
  routes `/reservations`/`/settings` straight to the page components with
  no layout wrapper, so the sidebar and logout button don't currently
  render anywhere. Predates this login rework; needs `App.tsx`'s routes
  nested under `<DashboardLayout>` (or similar) to actually show it.
- Registration is fully open — anyone who reaches `/auth` can create a new
  club (`POST /auth/register`), there's no invite/approval step or email
  verification.
- **Reservations are mock/in-memory**, regenerated fresh on every request
  (deterministic per date, not stored) — there is no reservations table
  yet (see [Database schema](../db-schema.md)) and no link to the actual
  WhatsApp booking flows.
- **Settings are in-memory** — a single process-lifetime object, resets on
  every server restart, not persisted to the database, not actually used
  by the booking flows to compute availability.
- No `.test.ts` for either new module — this repo doesn't have a test
  runner (vitest) set up yet, same gap noted in
  [whatsapp-messaging.md](whatsapp-messaging.md) and
  [court-booking-flow.md](court-booking-flow.md).
- No click-to-create — the calendar is read-only, no way to add/edit/
  cancel a reservation from the dashboard yet.
- With enough courts the grid gets wide (courts × 7 days of columns) and
  needs horizontal scrolling — no responsive/mobile layout for it yet.
