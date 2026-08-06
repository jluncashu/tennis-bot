# TenisBot

Monorepo with `packages/api` (Express + Drizzle + Postgres, TypeScript) and
`packages/web` (currently a placeholder). The API is a WhatsApp bot for
tennis bookings.

## Two knowledge bundles

Both are [OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
bundles: a directory of markdown files with YAML frontmatter, one concept
per file, cross-linked. Start at each bundle's `index.md`.

- **[docs/conventions/](docs/conventions/index.md)** — how code *should*
  be structured. Read before writing or modifying backend code.
- **[docs/app/](docs/app/index.md)** — what *is* actually built: shipped
  features, how they interact, and the live DB schema. Read before
  starting work on a feature so you know what already exists and don't
  duplicate or break it.

## Building in `packages/api`

Every new feature is a self-contained folder under `src/modules/<name>/`
with (in order) `<name>.schema.ts`, `<name>.repository.ts`,
`<name>.service.ts`, `<name>.controller.ts`, `<name>.router.ts`,
`<name>.test.ts` — see
[docs/conventions/module-pattern/](docs/conventions/module-pattern/index.md)
for the full pattern with examples. Also relevant:
[WebSocket conventions](docs/conventions/websockets/index.md),
[auth conventions](docs/conventions/auth/index.md),
[shared utilities](docs/conventions/shared-utilities/index.md),
[config](docs/conventions/config/index.md), and
[bootstrap](docs/conventions/bootstrap/index.md).

The existing `packages/api/src/{controllers,routes,services}/whatsapp.*`
files predate this convention (flat directories, not a `modules/` folder).
Leave them as-is unless the task is specifically to migrate them — don't
restructure old code as a side effect of unrelated work.

## Documenting features as you build (`docs/app/`)

After adding or meaningfully changing a feature, in the **same commit**:

1. Add or update its concept under `docs/app/features/<name>.md` (copy the
   frontmatter shape used in
   [whatsapp-messaging.md](docs/app/features/whatsapp-messaging.md): `type:
   Feature`, `title`, `description`, `tags`, `resource` pointing at the
   main router file, `generated: { by, at }`). Cover: what it does, its
   endpoints/handlers, which files it lives in, what it interacts with,
   required config, and known gaps.
2. List it in `docs/app/features/index.md`.
3. If it adds or changes a Drizzle table, update `docs/app/db-schema.md`
   to reflect the table **as it exists**, not as planned.
4. If it adds a new external integration or a new inbound/outbound edge
   between features, update the diagram in `docs/app/architecture.md`.

The goal is that a future session (agent or human) can read `docs/app/`
and understand the system without re-reading the whole codebase. Don't let
this drift — a stale `docs/app/` is worse than no `docs/app/`, since
consumers trust it as current state.

Set `generated.by` to `claude-code/sonnet-5` (or the actual model/tool
that authored the change) and `generated.at` to the current date, per the
[actor convention](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md#7-actor-convention).
