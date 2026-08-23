# Margonem runtime integration

## Purpose

`MargonemRuntimeBridge` is the only event boundary between the game client and
Lootlog. It shields features from NI/SI implementation details and preserves
Margonem's behavior exactly. Observing a request or response must never mutate,
replace, delay, suppress, or supplement it.

The bridge has two streams:

1. `intent` describes a supported outgoing user action. The first intent is
   `talk`, containing the clicked NPC ID and the best snapshot available at the
   time of the request.
2. `applied` describes a response after the original Margonem handler returns
   successfully. The bridge does not parse or route ordinary packets before
   Margonem.

`RuntimeEventPipeline` owns the bounded FIFO queue, store projection, and the
single shared domain processor. Overlapping client registrations keep one
processor active until the final registration is released. Applied observers
only enqueue work; projection and processors run in a later macrotask after the
Margonem call has returned.

`applied` is not emitted when the original handler throws. The original `this`,
argument objects, callbacks, exception, and return value are preserved.
Every observer is isolated from every other observer and from Margonem. An
`intent` or `applied` subscriber may throw without preventing later subscribers
or changing the original call. Envelope and outgoing-observation failures are
isolated in the same way. A successfully handled packet consumes the active
intent even if an `applied` observer fails. A packet rejected by Margonem does
not consume it.

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

After Margonem returns, each payload is parsed once and assigned a monotonically
increasing sequence:

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

When the queued packet is processed, `RuntimeStateProjection.captureIngress()`
adds a deliberately sparse pre-event view from Lootlog stores. It contains the
game identity/map only for consumers that require it, the captured intent, NPCs
named by dialog or `npcs_del`, and other players named by battle warriors. Never
copy the complete NPC or player collection per event.

## Sources of truth

Use this order:

1. An `intent` identifies the user's action.
2. The initial adapter snapshot seeds Lootlog after late installation.
3. Domain stores represent the current projected world.
4. Applied facts identify the change in the current packet.
5. The ingress snapshot represents Lootlog store state immediately before that
   packet is projected.

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

- `RuntimeStateProjection.bootstrap()` reads one complete snapshot through the
  active adapter. This is the only normal full-domain read and solves late
  userscript installation after Margonem's initial packets.
- The projection then reduces `h`, `town`, `other`, `party`, `friends`,
  `npc_tpls`, `icons`, `npcs`, and `npcs_del` directly into domain stores.
  `town` clears map-scoped projections and advances their epochs without a
  second full Margonem scan.
- NPC templates and icons are cached from events. NI commonly enriches the same
  `npcs` entries while applying them. If neither the packet nor the cache can
  compose an NPC, a single-ID adapter lookup is the compatibility fallback.
- Other-player identity comes from `CREATE`; movement packets do not publish
  identity state. The direct Margonem handle lookup on `CREATE` is retained only
  in the private tooltip/renderer integration registry.
- `bootstrapProjection()` rebuilds derived feature state from ready domain
  stores. It does not read runtime globals and must not poll for readiness.

The pipeline buffers applied envelopes until bootstrap succeeds. Its queue is
bounded by event and fact counts. One scheduled macrotask drains all pending
FIFO work. Events appended while that task is processing are drained in the
same pass. Queue overflow tears down processing instead of producing a partial
history. Cleanup restores a hook only if our wrapper is still installed and
clears subscriptions, queued work, intents, projections, and process context.

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

- Let Margonem finish before parsing or dispatching an ordinary payload.
- Parse and normalize a payload once.
- Never scan all NPCs or others outside bootstrap.
- Ordinary events cost O(number of touched IDs).
- Commit at most once per touched domain store per event.
- Do not `structuredClone` packets or the world on the hot path.
- Do not add readiness polling.
- Do not cause store publications from projection hooks.
- Keep the queue bounded by event and fact count.
- Preserve references for semantically identical game, NPC, other, party, and
  friend data so Zustand selectors do not wake React consumers.
- Subscribe components to the smallest identity fields they use. Position or HP
  changes must not render chat, event mode, or identity-only consumers.
- Inactive Shift integrations must not scan runtime handles or the DOM, wrap the
  renderer, subscribe to broad collections, or write presentation state.

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
2. Normalize IDs and data in the event projection exactly once.
3. Keep runtime globals and object handles inside runtime integration modules.
   UI/render/action capabilities belong in an explicit adapter, not a feature.
4. Add only referenced entities to ingress.
5. Reconcile the domain from the queued `applied` envelope with one batched
   publication.
6. Rebuild feature projections from stores, never runtime globals.
7. Test object and string packets, wrapper transparency, cleanup, and failure.
8. Run loot/battle golden tests and compare API call counts and hashes.
9. Run the replay benchmark, full suite, typecheck, and lint.
