# Game client runtime rules

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
- Run the same replay benchmark before and after runtime changes. A throughput
  regression above 10% or an algorithmic regression blocks completion.
- Before handing off, run targeted runtime/processor tests, the complete test
  suite, TypeScript typecheck, and `pnpm --filter @lootlog/game-client lint`.
