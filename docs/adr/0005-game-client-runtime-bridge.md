# 0005. The game client stays behind a runtime bridge

Status: accepted

## Context

The game client runs inside Margonem's own page. It shares the page's global
objects, DOM, stylesheet cascade, and main thread with a game Lootlog does not
control and that changes without notice. A mistake there does not break
Lootlog alone; it slows or breaks the game for the player. Not interfering
with Margonem is the first priority in every trade-off, and a client
performance regression blocks a release.

## Decision

Margonem globals are read in one place. Only the runtime bridge and the
runtime adapters under `apps/game-client/src/lib/margonem-runtime` may touch
them; the rest of the client works with Lootlog's own domain stores. An
architecture test fails when any other source file references a game global.

Observers are isolated from each other, so one failing observer cannot affect
the game or another observer. The client preserves the game's object,
callback, `this`, exception, return-value, and request-count semantics.

The client ships its own stylesheet and UI primitives with a prefixed Tailwind
build (`ll:`), separate from `packages/ui`. The stylesheet is matched against
every element the game inserts, so selectors are kept cheap: no `:has()`-based
variants and no universal selectors outside the scoped preflight.

## Consequences

- A change in the game is absorbed in the bridge and adapters instead of
  across features.
- Changes to the runtime, adapters, processors, and stores need
  characterization tests.
- UI primitives exist twice, in the game client and in `packages/ui`. Shared
  behavior belongs in headless logic; the styled components stay separate.
- Some Tailwind features are off limits in the game client.
