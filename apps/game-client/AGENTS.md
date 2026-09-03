# Game client runtime rules

Read the root `PRODUCT.md`, `ARCHITECTURE.md`, and `SECURITY.md` before changing
this app. Read `PRODUCT.md` in this directory for the Game client's surface
boundary.

Before changing the runtime bridge, NI/SI adapters, synchronizers, event
processors, projections, or runtime/domain stores, read
[`docs/runtime-integration.md`](docs/runtime-integration.md).

- Never modify inbound or outgoing Margonem data. Preserve the exact arguments,
  object references, callbacks, `this`, exceptions, and return values.
- Isolate every runtime observer. One subscriber or diagnostic reporter throwing
  must not block another subscriber or affect Margonem.
- Never read `Engine`, `g`, `_g`, `successData`, `API`, `CFG`, legacy UI
  globals, or `Game` outside the bridge, state adapter, or an explicit module in
  `lib/margonem-runtime/adapters`. This applies to all production source,
  including components and feature controllers.
- Renderer, tooltip, glow, character-action, and legacy UI behavior must cross
  their dedicated adapter boundary. Do not restore global `Window` typings for
  Margonem capabilities.
- Never perform a full NPC/other scan on an ordinary event hot path. Full scans
  are limited to bootstrap and `town` reconciliation.
- Add characterization tests before refactoring an existing runtime path.
- Never update golden expectations only to make new code pass. A deliberate
  behavior/model change requires explicit approval and must preserve the API
  contracts that were not approved for change.
- Preserve dialog/fight loot payloads and request counts, battle DTO ordering,
  `submissionId`, battle hashes, kill hashes, and dialog-context consumption.
- Keep ordinary play responsive. Closed windows must not retain expensive
  rendering, subscriptions, scans, or derived work. A visible performance
  regression blocks completion even when behavior is correct.
- For runtime, adapter, processor, projection, or domain-store changes, run the
  same replay benchmark before and after. A throughput regression above 10% or
  an algorithmic regression blocks completion. Also run targeted
  runtime/processor tests, the complete app test suite, TypeScript typecheck,
  and `bun run --filter @lootlog/game-client lint`.
- For isolated UI or copy changes, run focused tests, TypeScript typecheck, and
  lint. CI remains responsible for the complete suite before merge.
- Measure rendering work when a UI change can affect game performance even if
  it does not touch the runtime bridge.
