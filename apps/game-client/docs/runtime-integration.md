# Margonem runtime integration

## Purpose

`MargonemRuntimeBridge` is the only event boundary between the game client and
Lootlog. It shields features from NI/SI implementation details and preserves
Margonem's behavior exactly. Observing a request or response must never mutate,
replace, delay, suppress, or supplement it.

The bridge has three streams:

1. `intent` describes a supported outgoing user action. The first intent is
   `talk`, containing the clicked NPC ID and the best snapshot available at the
   time of the request.
2. `incoming` describes a server response before Margonem applies it. Processors
   use it when pre-event state or exact packet ordering matters.
3. `applied` describes the same envelope after the original Margonem handler
   returns successfully. Domain state is reconciled only on this stream.

`applied` is not emitted when the original handler throws. The original `this`,
argument objects, callbacks, exception, and return value are preserved.
Every observer is isolated from every other observer and from Margonem. An
`intent`, `incoming`, or `applied` subscriber may throw without preventing later
subscribers or changing the original call. Envelope and outgoing-observation
failures are isolated in the same way. Observer diagnostics include phase and
sequence; failures in the diagnostic reporter are also ignored. A successfully
handled inbound packet consumes the active intent even if an `applied` observer
fails. A packet rejected by Margonem does not consume it.

## Runtime adapters

Exactly one inbound adapter is active:

- NI prefers `Engine.communication.parseJSON`, covering WebSocket and AJAX. Its
  controlled fallbacks are `Engine.communication.successData` and then global
  `successData`.
- SI uses global `successData` until a more stable seam is verified.

NI adapters may access `Engine.*`. SI adapters may access `g.*` and legacy
globals. Application processors, components, feature hooks, and domain stores
may not. Rendering, tooltips, character actions, glows, cookies, messages, and
zoom are separate adapter capabilities under `margonem-runtime/adapters`.
Map Pings and AirTags receive the renderer capability through dependency
injection. Global `Window` declarations do not expose Margonem capabilities.
`_g` is the primary outgoing seam. NI `send`/`send2` are read-only, deduplicated
fallbacks. Only registered intents are published.

Installation uses bounded retries before and after game initialization. A
missing inbound seam after the retry budget is fatal. A missing outgoing seam
does not stop incoming processing, but dialog loot without trusted context is
skipped.

## Envelopes and facts

Each payload is parsed once and assigned a monotonically increasing sequence:

```ts
type RuntimeEventEnvelope = {
  sequence: number;
  observedAt: number;
  facts: readonly RuntimeFact[];
  ingress: RuntimeIngressSnapshot;
  raw?: GameEvent;
};
```

Facts provide stable routing for chat, dialog, battle, map, NPC changes, loot,
other players, AFK, friends, and party. Raw packets exist only during dispatch
and diagnostics; they are never stored in a domain store or persisted.

Ingress snapshots are deliberately sparse. They contain the game identity/map,
the active intent, NPCs named by dialog or `npcs_del`, and other players named by
battle warriors. Never copy the complete NPC or player collection per event.

## Sources of truth

Use this order:

1. An `intent` identifies the user's action.
2. Domain stores represent the current post-application world.
3. `incoming` facts identify the change in the current packet.
4. The ingress snapshot represents state immediately before that packet.

Domain stores contain immutable Lootlog models, never Margonem runtime models:

- `game.store` — `ni | si`, hero identity/position/clan, world, and map;
- `npcs.store` — NPCs keyed by numeric ID;
- `others.store` — other characters keyed by string character ID;
- `party.store` and `friends.store` — normalized membership data.

Each domain exposes `status` and `revision`. Map-scoped domains also expose
`mapEpoch`. `ready` with an empty collection is a valid state. Runtime object
handles required for canvas tooltips are kept in a private integration registry,
not in Zustand.

Battle, loot, dialog, detector, and AirTag stores are process state or feature
projections. They must not be treated as a mirror of the game world.

## Lifecycle

- `RuntimeStateSynchronizer.bootstrap()` reads one complete snapshot through the
  active adapter. This is allowed at startup and after confirmed game init.
- `reconcileAppliedEvent()` updates only domains and IDs touched by an applied
  event. A `town` event stages complete game, NPC, other, and handle snapshots
  before committing them. If any read fails, all four map-scoped domains are
  cleared together. Both success and failure advance each map epoch exactly
  once; party and friends are unaffected.
- `bootstrapProjection()` rebuilds derived feature state from ready domain
  stores. It does not read runtime globals and must not poll for readiness.

The bridge queues early incoming envelopes until `setReady(true)`. The queue is
bounded by event count, raw byte estimate, and fact count. Queue overflow tears
down processing instead of producing a partial history. Cleanup restores a hook
only if our wrapper is still installed and clears subscriptions, queues,
intents, synchronizers, and process context.

## Loot and battle contracts

Dialog loot is attributed only to the active talk context. `npcs_del` is
diagnostic and never selects the source NPC. Empty/intermediate packets do not
consume dialog context; the first valid `/loots` request does. A new talk, map
change, or teardown clears the prior context. Missing trusted context or NPC
snapshot skips submission rather than guessing.

Fight loot ordering, final-packet handling, battle DTOs, `submissionId`, battle
hashes, kill hashes, and the number and order of API calls are compatibility
contracts. Refactors must keep golden payloads deeply equal unless a behavior
change is explicitly approved.

## Performance invariants

- Parse and normalize a payload once.
- Never scan all NPCs or others outside bootstrap and `town` reconciliation.
- Ordinary events cost O(number of touched IDs).
- Commit at most once per touched domain store per event.
- Do not `structuredClone` packets or the world on the hot path.
- Do not add readiness polling.
- Do not cause store publications from projection hooks.
- Keep the queue bounded by count, bytes, and envelope cost.

Use the same replay fixtures, warm-up, iteration count, and machine for before
and after benchmarks. A median throughput regression above 10%, or any
algorithmic regression, blocks completion.
The checked-in reference and exact command live in
[`benchmarks/runtime-replay-baseline.md`](../benchmarks/runtime-replay-baseline.md).

## Failure and diagnostics

Diagnostics should include adapter/interface, seam, sequence, map epoch, intent
source, referenced ingress entities, domain readiness, and an exact reason. A
failed domain snapshot stays `uninitialized`. Outgoing interception remains
non-fatal; inbound interception is required.

## Extension checklist

When adding a fact, intent, adapter capability, or domain store:

1. Add characterization tests before changing the production path.
2. Normalize IDs and data in the adapter/parser exactly once.
3. Keep runtime globals and object handles inside runtime integration modules.
   UI/render/action capabilities belong in an explicit adapter, not a feature.
4. Add only referenced entities to ingress.
5. Reconcile the domain on `applied` with one batched publication.
6. Rebuild feature projections from stores, never runtime globals.
7. Test object and string packets, wrapper transparency, cleanup, and failure.
8. Run loot/battle golden tests and compare API call counts and hashes.
9. Run the replay benchmark, full suite, typecheck, and lint.
