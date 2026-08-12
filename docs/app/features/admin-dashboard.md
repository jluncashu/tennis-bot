---
type: Feature
title: Admin dashboard
description: A login-gated web dashboard (packages/web) for managing court Reservations (react-big-calendar day grid with a date picker, all courts as sub-columns), Settings, and a call-center availability/booking search — real JWT-backed auth, but Reservations/Settings data is generated entirely client-side (mock modules), not fetched from the API.
tags: [web, admin, dashboard, reservations, settings, calendar, auth, booking-search]
resource: packages/web/src/App.tsx
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-12T00:00:00Z }
---

# What it does

A single-page admin app in `packages/web` (Vite + React + TypeScript +
Tailwind + React Router), previously an empty placeholder. It gates access
behind a login/register page, then (once authenticated) shows
**Reservations**, **Settings**, and a call-center **booking search**.

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
signup, not invite-only. `/reservations` and `/settings` are nested under
`<DashboardLayout>` (sidebar nav + "Log out"), which renders normally.

**Gotcha for anyone touching `packages/api/src/app.ts`**: the JSON error
handler (`errorMiddleware`, registered last) is what turns a thrown
`httpError(...)` into `{ error: "..." }`. If it's ever missing, Express's
default handler takes over and returns an HTML stack-trace page instead —
the login form still "works" for correct credentials, but every failure
(wrong password, duplicate email, etc.) shows a useless
`"Request failed with status 401"` because the frontend can't find
`response.data.error` in an HTML body. This exact regression happened (the
middleware was accidentally dropped while fixing CORS) and was the root
cause the one time this looked like "I cannot login" — it wasn't CORS, auth
itself worked fine over curl.

## Layout and pages

- `src/components/DashboardLayout.tsx` — left sidebar (Reservations,
  Settings, Log out) + `<Outlet/>` content area, nested under
  `/reservations` and `/settings` in `src/App.tsx`.
- `src/pages/ReservationsPage.tsx` — a
  [react-big-calendar](https://github.com/jquense/react-big-calendar)
  **Day** view for one selected date at a time, split into one sub-column
  per court (`resources` = the local mock settings' `courts` list,
  `resourceGroupingLayout`). Header controls: a native
  `<input type="date">` date picker (jumps to any date), and
  "◀ Previous day / Today / Next day ▶" buttons (`toolbar={false}` hides
  react-big-calendar's own; `onNavigate` is a no-op — this component, not
  the library, owns navigation via `selectedDate` state). A "New booking"
  button in the header opens the [booking search](#booking-search-call-center)
  modal. Events are color-coded by status (confirmed/pending/cancelled) via
  `eventPropGetter`, with a custom `components.event` renderer (name +
  status). An event's end time is `startHour + (durationMinutes ??
  settings.slotDurationMinutes)` — most mock reservations are exactly one
  slot long (no `durationMinutes`), but bookings made through the search
  modal can span multiple hours.

  **Why a day view, not the original week view**: the page originally
  showed a full Monday–Sunday week (all courts × 7 days). It was changed to
  a single selected day (all courts as sub-columns) plus a date picker, on
  request — a call-center agent typically cares about "today" or one
  specific date a customer asks about, not a whole week at once.

  **Why react-big-calendar and not FullCalendar**: FullCalendar's
  equivalent (`@fullcalendar/resource-timegrid`) is FullCalendar
  *Premium* — tri-licensed (paid commercial license / non-commercial
  CC-BY-NC-ND trial / GPLv3), none of which fit a closed-source commercial
  booking product for free. react-big-calendar's resource view is plain
  MIT.

  Times render 24-hour EU-style (`08:00`, not `8am`) via
  `dayjs.locale("en-gb")` (imported once at module scope) plus explicit
  `formats.timeGutterFormat`/`eventTimeRangeFormat` overrides — the rest of
  the UI stays English, only date/time formatting changes. CSS overrides in
  `src/index.css` (`.rbc-*` selectors, several needing `!important` since
  `react-big-calendar/lib/css/react-big-calendar.css` is imported inside
  `ReservationsPage.tsx` and can land after `index.css` in the bundle) give
  it a more polished look: refined grid-line/today-highlight colors,
  rounded shadowed event blocks, the library's built-in
  `.rbc-current-time-indicator` recolored to match.
- `src/pages/SettingsPage.tsx` — form for opening hours, slot duration,
  price per slot, and **courts**: a repeatable list of `{ name, covered }`
  rows (text input + "Covered" checkbox + remove button, "+ Add court"
  below), not the plain comma-separated text field it used to be — courts
  now need a covered/uncovered attribute for the
  [booking search](#booking-search-call-center)'s field-type filter to mean
  anything. Calls `getSettings()`/`saveSettings()` from the local mock
  store on load/save (see [Data source](#data-source-mock-not-the-api)).
- `src/lib/date.ts` — shared date helpers (`toDateId`/`fromDateId`
  round-trip `<input type="date">`'s `YYYY-MM-DD` value using local
  calendar fields, never UTC, so the picker can't shift a day depending on
  the browser's timezone; `startOfDay`, `addDays`, `pad`). Used by
  `ReservationsPage`, the mock reservation/availability modules, and
  `BookingSearchModal`.
- `src/lib/api.ts` — small `fetch` wrapper (`apiGet`/`apiPut`) against
  `VITE_API_URL`. **Currently unused** — see
  [Data source](#data-source-mock-not-the-api). Auth instead goes through
  the separate axios instance in `src/api/api.ts` (attaches the Bearer
  token from the store on every request, `withCredentials: true` for the
  refresh cookie) — see Login above.
- Routes (`src/App.tsx`): `/auth` (login/register, redirects to
  `/reservations` if already authenticated), `/reservations` + `/settings`
  (nested under `<DashboardLayout>`, each individually gated on
  `accessToken`, redirecting to `/auth` when absent), `/` and unknown paths
  redirect to `/reservations`.

## Booking search (call-center)

A "New booking" button on `ReservationsPage` opens
`src/components/BookingSearchModal.tsx` — built for a call-center agent
who has a customer on the phone asking for something like "Wednesday
20:00 for 2 hours", not a specific date. Two steps:

1. **Search** — filters: days of the week (multi-select chips, none =
   every day), start time + duration (selects, driven by
   `settings.openHour`/`closeHour`), field type (Covered / Uncovered
   toggle chips, neither = both), field number (dropdown of registered
   courts, default "Any field"). "Search" calls
   `searchAvailability()` (`src/mocks/availability.mock.ts`), which scans
   the next 4 weeks for (date, court) pairs where the requested time
   window is free and open, using the same `mockReservationsForDay()` the
   calendar renders — so a slot shown here is exactly what the calendar
   would show as free. Cancelled reservations don't block a slot.

   **Long-term opportunity**: if one court is free at that exact
   weekday/time on *every* occurrence found in the 4-week window (at least
   3), it's returned separately and rendered as a highlighted card pinned
   **first**, above the regular per-date results — "free every Wednesday
   for the next 4 weeks" is the point of the case this was built for.
2. **Confirm** — clicking "Book" on either a regular result or the
   long-term card asks for the customer's name and phone (not collected
   during search, since the agent doesn't know which slot the customer
   wants yet), then calls `addManualBooking()`
   (`src/mocks/reservations.mock.ts`) once per date — one call for a
   single slot, one call per week for a long-term booking (all N weeks
   booked in one confirm). The parent page's `onBooked` callback
   re-reads `mockReservationsForDay(selectedDate)` so a booking on the
   currently-viewed date shows up on the calendar immediately.

## Data source: mock, not the API

**Reservations and Settings are generated entirely in the browser** —
`src/mocks/reservations.mock.ts` and `src/mocks/settings.mock.ts` — not
fetched from `packages/api`. Both pages still have the original
`apiGet`/`apiPut` calls against `packages/api/src/modules/{reservations,settings}/`
present in the file, commented out (`// old: fetched mock data through the
backend`); the live code path calls the local mock functions instead. This
predates the day-view/booking-search work in this doc — treat the backend
`reservations`/`settings` modules (still present, still following the
[module pattern](../../conventions/module-pattern/index.md), still listed
under Endpoints below) as **orphaned**: correct in isolation, but nothing
in `packages/web` currently calls them. Only `auth` is wired end to end
frontend-to-backend-to-database.

- `src/mocks/reservations.mock.ts` — `mockReservationsForDate(dateId)`
  deterministically generates 2-4 reservations per day (seeded by a hash of
  the date, walking a seeded LCG to avoid two reservations colliding on the
  same court/hour) against a **hardcoded** `COURTS = ["Teren 1", "Teren 2",
  "Teren 3"]` — independent of whatever courts are configured in Settings
  (see Known gaps). `addManualBooking()` appends to a module-level
  `manualBookings` array (bookings made through the search modal above);
  `mockReservationsForDay(date)` merges generated + manual for that date.
  All of it resets on page reload — nothing is persisted.
- `src/mocks/settings.mock.ts` — a single module-level mutable
  `CourtSettings` object (`openHour`, `closeHour`, `slotDurationMinutes`,
  `courts: Court[]` where `Court = { name, covered }`,
  `pricePerSlotRON`), seeded with
  `{ 8, 22, 60, [Teren 1 (covered), Teren 2, Teren 3], 80 }`.
  `saveSettings()` validates `openHour < closeHour`, throws otherwise.
  Resets on page reload.
- `src/mocks/availability.mock.ts` — pure search function over the above,
  described under [Booking search](#booking-search-call-center).

# Endpoints

`reservations` and `settings` are mock modules in `packages/api`, following
the [module pattern](../../conventions/module-pattern/index.md) with
Zod-only schemas (they don't own a DB entity — see the "does not own an
entity" case in [Schema](../../conventions/module-pattern/schema.md)).
`auth` is a real module backed by the `clubs` table (see
[Database schema](../db-schema.md)) — also schema-only from the module
pattern's perspective, since it doesn't define its own table (`clubs` lives
in a separate `clubs` module it reads/writes). **`reservations` and
`settings` are not currently called by `packages/web`** — see
[Data source](#data-source-mock-not-the-api) above.

| Method | Path                | Handler                       |
|--------|---------------------|--------------------------------|
| POST   | `/auth/register`    | `registerController` — creates a `clubs` row, sets the `refreshToken` cookie, returns `{ accessToken, club }` |
| POST   | `/auth/login`       | `loginController` — verifies against `clubs.password_hash` (argon2), same response shape |
| POST   | `/auth/refresh`     | `refreshController` — reads the `refreshToken` cookie, rotates both tokens |
| POST   | `/auth/logout`      | `logoutController` — clears the `refreshToken` cookie |
| GET    | `/auth/me`          | `getMeController` — `requireAuth`-gated, returns the current club |
| GET    | `/api/reservations` | `listReservationsController` (`?date=YYYY-MM-DD` for one day, else `?weekOffset=N` for that Monday-Sunday calendar week) — unused by the frontend today |
| GET    | `/api/settings`     | `getSettingsController` — unused by the frontend today |
| PUT    | `/api/settings`     | `updateSettingsController` — unused by the frontend today |

# Enabling changes

These didn't exist before this feature despite being documented in
[shared utilities](../../conventions/shared-utilities/index.md):

- `packages/api/src/shared/http-error.ts` and
  `packages/api/src/shared/middleware/error.middleware.ts` — registered
  last in `app.ts`. (Note: the convention doc's example path is
  `shared/utils/http-error.ts`; the actual file lives directly under
  `shared/`, one level up from where the convention shows it — pre-existing
  drift, left as-is rather than moved as a side effect of unrelated work.)
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
   |  POST /auth/refresh ---------> |  verify refreshToken cookie -> rotate tokens
   |  POST /auth/logout ----------> |  clear refreshToken cookie
```

Reservations, Settings, and the booking search are entirely client-side
(see [Data source](#data-source-mock-not-the-api)) — no requests leave the
browser for them. Auth is the only part of this feature that touches the
network or the database (the `clubs` table).

# Config

- `packages/api`: `CLIENT_URL` (validated in `src/config/env.ts`, default
  `http://localhost:5173`); `JWT_SECRET` (min 32 chars, no default —
  required to sign/verify access + refresh tokens, see
  [token strategy](../../conventions/auth/token-strategy.md)).
- `packages/web`: `VITE_API_URL` (default `http://localhost:3000`, see
  `.env.example`) — only used by the auth axios instance now; the
  `apiGet`/`apiPut` wrapper that also reads it is currently dead code (see
  [Data source](#data-source-mock-not-the-api)).

# Known gaps

- **Reservations/Settings are frontend-only mock data**, not fetched from
  the backend at all (see [Data source](#data-source-mock-not-the-api)) —
  resets on every page reload, and the backend `reservations`/`settings`
  modules are effectively orphaned. Booking search inherits this: manual
  bookings only live as long as the tab does.
- **`reservations.mock.ts`'s court list is hardcoded**
  (`["Teren 1", "Teren 2", "Teren 3"]`), independent of the courts actually
  configured in Settings. Renaming a court, or adding/removing one, in
  Settings does not affect which courts the generated (non-manual)
  reservations use — a renamed/new court will simply always show as fully
  available in searches and on the calendar, since no generated
  reservation ever references it. Manual bookings via the search modal use
  whatever court name Settings has at booking time, so they're unaffected.
- Registration is fully open — anyone who reaches `/auth` can create a new
  club (`POST /auth/register`), there's no invite/approval step or email
  verification.
- No `.test.ts` for either backend mock module — this repo doesn't have a
  test runner (vitest) set up yet, same gap noted in
  [whatsapp-messaging.md](whatsapp-messaging.md) and
  [court-booking-flow.md](court-booking-flow.md). No frontend tests either.
- No click-to-create from the calendar grid itself — creating a
  reservation only happens through the booking search modal, not by
  clicking a slot directly.
- With enough courts the grid gets wide (one column per court) and needs
  horizontal scrolling — no responsive/mobile layout for it yet.
