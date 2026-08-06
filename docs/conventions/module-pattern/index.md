# Module pattern

Every feature is a self-contained folder under `src/modules/<name>/`. A
module owns exactly seven files, added in this order:

* [Schema](schema.md) - `<name>.schema.ts` — Drizzle table + types, or Zod request schemas only
* [Repository](repository.md) - `<name>.repository.ts` — DB queries
* [Service](service.md) - `<name>.service.ts` — business logic
* [Controller](controller.md) - `<name>.controller.ts` — parse request, call service, send response
* [Router](router.md) - `<name>.router.ts` — map URLs to controllers
* [Testing](testing.md) - `<name>.test.ts` — Vitest unit tests for the service layer

A `<name>.middleware.ts` file (route-specific middleware) may also be added
when needed; see [the auth middleware](/auth/) for a worked example.

# Schema ownership

The Drizzle table lives in the module that *owns* the entity. Other modules
that need it import from there rather than redefining it. For example, the
`auth` module imports the `restaurants` table from
`modules/restaurants/restaurants.schema.ts` — it does not define its own
table; see [Schema](schema.md).
