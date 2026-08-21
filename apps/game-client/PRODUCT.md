# Game-client product context

Read the canonical [`PRODUCT.md`](../../PRODUCT.md) first. This file defines the
Game client's local responsibilities.

## Purpose

The Game client embeds Lootlog in supported Margonem pages. It observes
supported gameplay events, provides immediate live tools, and synchronizes
selected state with Lootlog services without playing on the user's behalf.

## Responsibilities

- Live timers, NPC information, chat, notifications, presence, pings, and small
  coordination actions.
- Bounded capture of loot, kills, and battles.
- Account, character, world, and Organization context.
- A shared product core across supported installation methods.

## Constraints

- Never automate movement, combat, or player decisions.
- Preserve Margonem arguments, object identity, callbacks, exceptions, and
  return values at the runtime boundary.
- Normal play should not feel slower with Lootlog enabled.
- Closed UI must not keep expensive rendering or derived work alive.
- Under pressure, supporting work degrades before capture, chat,
  notifications, or timers.
- Support both NI and SI. Tampermonkey is current; the planned Chrome extension
  must reach full feature and protocol parity before stable release.
- User-facing copy is localized; Polish is the supported product language.

## Feature status

Timers, NPC information, chat, notifications, presence, capture, and event-mode
coordination are core. Party finder, ready rooms, air tags, and the Chrome
extension before parity are experimental until product evidence promotes or
retires them.

Read `AGENTS.md` and `docs/runtime-integration.md` before touching the runtime
bridge, adapters, processors, projections, or domain stores.
