# WebSocket conventions

WebSocket logic lives in `src/shared/ws/` and is module-agnostic. Individual
feature modules attach handlers to the central dispatcher — they do not
create their own WS servers.

* [Message envelope](message-envelope.md) - the shared shape of every WS message
* [Client registry](registry.md) - the connectionId → WebSocket map, plus `send`/`broadcast`
* [Handler dispatcher](handler-dispatcher.md) - routes incoming messages to per-type handlers
