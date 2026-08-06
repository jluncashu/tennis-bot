---
okf_version: "0.2"
---

# TenisBot — Application Knowledge

This bundle tracks what the app **actually does**: shipped features, how
they interact with each other and with external systems, and the live
database schema. Unlike [docs/conventions](../conventions/index.md), which
prescribes how code *should* be structured, this bundle describes what
*is* built — keep it in sync with every feature-affecting commit (see the
update policy in the repo-root `CLAUDE.md`).

# Structure

* [Features](/features/) - one concept per shipped feature: what it does, its endpoints/handlers, and how it interacts with other features
* [Database schema](/db-schema.md) - the live Drizzle tables, kept in sync with `src/db/schema.ts`
* [Architecture](/architecture.md) - how features, the database, and external systems interact
