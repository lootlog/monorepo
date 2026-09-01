---
---

Internal refactor: collapse the six per-event methods on `EventEmitterService` into one
generic `emit(routingKey, payload)` with a `RoutingKey`-keyed payload type, and remove the
unused `emitTimerUpdate` (the `guilds.timers.update` key is published by `TimersService`).
No runtime or wire-contract change — the five `event.*` payloads serialize identically.
