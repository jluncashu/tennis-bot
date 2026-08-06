---
okf_version: "0.2"
---

# TenisBot API — Backend Engineering Conventions

This bundle documents the conventions used in `packages/api`: how feature
modules are structured, how WebSockets, auth, shared utilities, config, and
process bootstrap are organized. It is formatted per the
[Open Knowledge Format (OKF) v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
so both humans and agents can navigate and extend it consistently.

# Structure

* [Folder structure](/folder-structure.md) - top-level layout of `src/`
* [Module pattern](/module-pattern/) - the six-file recipe every feature module follows
* [WebSocket conventions](/websockets/) - message envelope, client registry, and dispatcher
* [Auth conventions](/auth/) - token strategy and cookie options
* [Shared utilities](/shared-utilities/) - the http-error factory and the global error handler
* [Config](/config/) - environment validation
* [Bootstrap](/bootstrap/) - process entrypoint and the Express app factory
