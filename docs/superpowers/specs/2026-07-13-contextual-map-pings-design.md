# Contextual Map Pings Design

## Summary

Contextual map pings extend the existing NI-only map ping into a small shared vocabulary. A quick activation keeps the current fast path and sends an `attention` ping. Holding the same configured hotkey for 300 ms opens a radial wheel with four ping types: `attention`, `enemy`, `regroup`, and `avoid`.

The feature reuses the current game-client renderer, Socket.IO events, gateway authorization, guild scoping, map scoping, rate limiting, preferences, and sound volume. It does not introduce a second realtime channel or persistent storage.

## Goals

- Preserve the speed of the existing default map ping.
- Let a player communicate one of four common tactical meanings without chat or voice.
- Render the selected meaning consistently on the main canvas and handheld minimap.
- Keep all existing authorization, guild, world, and map boundaries.
- Make the interaction deterministic for keyboard and mouse hotkey bindings.
- Keep the feature entirely ephemeral.

## Non-goals

- Object-aware pings for players, NPCs, transitions, or loot.
- Ping reactions, acknowledgements, cancellation after sending, or lifecycle state.
- Additional ping-wheel levels or user-defined ping types.
- SI support.
- Persistent ping history or analytics.
- Changes to rate-limit policy or ping recipients.

## Product behavior

### Ping types

The shared contract exposes a closed `MapPingType` union:

| Type        | User-facing label | Meaning                   | Color     | Symbol           | Duration | Sound rate |
| ----------- | ----------------- | ------------------------- | --------- | ---------------- | -------- | ---------- |
| `attention` | Uwaga             | General point of interest | `#f59e0b` | exclamation mark | 2.5 s    | `1.0`      |
| `enemy`     | Wróg              | Enemy or immediate danger | `#ef4444` | crosshair        | 4 s      | `1.35`     |
| `regroup`   | Zbiórka           | Group meeting point       | `#3b82f6` | concentric rings | 5 s      | `0.82`     |
| `avoid`     | Unikaj            | Area to avoid             | `#a855f7` | diagonal cross   | 5 s      | `0.62`     |

Each type has a distinct canvas/minimap symbol and sound cue. Labels are translated through the game-client i18n resources. Colors are not the only discriminator.

### Tap interaction

1. The player presses the configured `map-ping` keyboard key or mouse button while the pointer is over the main map or handheld minimap.
2. The client captures the target tile and pointer position at press time.
3. If the binding is released before 300 ms, the client sends one `attention` ping at the captured tile.
4. The local optimistic marker and sound appear immediately on release.

Capturing the tile on press prevents the target from changing if the pointer moves while the binding is held.

### Hold interaction

1. After 300 ms, the client opens a radial wheel centred near the captured pointer position.
2. The wheel has an 88 px outer radius, a 24 px central dead zone, and four equal directional segments centred on the cardinal directions.
3. Pointer movement selects a segment by angle. Top selects `attention`, right selects `enemy`, bottom selects `avoid`, and left selects `regroup`. Exact half-open ranges are `[-135°, -45°)` for top, `[-45°, 45°)` for right, `[45°, 135°)` for bottom, and the remaining range for left, using the screen coordinate system where positive Y points down.
4. The selected segment receives a strong visual highlight and its translated label is shown in the centre.
5. Releasing the original binding sends the selected type at the captured tile.
6. Releasing inside the dead zone cancels without sending. This avoids accidental pings when a hold was unintentional.

Selection uses a logical vector from the pointer position captured on press to the latest pointer position. The visual wheel centre is independently clamped to stay at least 100 px from every viewport edge: 88 px for the wheel and 12 px of margin. If either viewport dimension is smaller than 200 px, that axis uses the viewport midpoint and permits visual clipping. Consequently, an edge-adjacent wheel may be drawn inward while its segment selection still reflects movement away from the original press point. Opening the wheel does not select a segment until a post-open pointer movement leaves the 24 px dead zone. The wheel does not intercept pointer events from Margonem.

### Cancellation and cleanup

An open or pending interaction is cancelled without sending when any of the following occurs:

- the player presses `Escape`;
- the game window loses focus;
- the active map changes;
- the gateway disconnects or the socket leaves its authenticated/joined state;
- map pings are disabled;
- the component unmounts.

Repeated keyboard `keydown` events never create additional interactions. A second press while one interaction is active is ignored.

## Architecture

### Shared contract

`packages/types/src/common/map-ping.types.ts` defines the runtime list of supported types and derives `MapPingType` from it. Both `MapPingSendPayload` and `MapPingEvent` require a `type` field.

No compatibility fallback is added for payloads without `type`. Game-client and gateway are released from the same monorepo and the project does not require backwards compatibility for this change.

### Hotkey lifecycle

The existing `useHotkeys` hook currently handles only activation on `keydown` or `mousedown`. It will expose the map-ping binding as a lifecycle:

- `onMapPingStart(event)` on the matching initial press;
- `onMapPingEnd(event)` on the matching release;
- `onMapPingCancel()` for loss of focus and cleanup.

Other hotkey actions keep their current one-shot behavior. Binding matching at press time continues to use the configured key or mouse button and configured modifiers. Once accepted, the hook captures a stable press identity:

- keyboard: `{ kind: "keyboard", code: event.code }`;
- mouse: `{ kind: "mouse", button: event.button }`.

Keyboard release matches only the captured `event.code`; mouse release matches only the captured `event.button`. Release modifiers and `event.key` are deliberately ignored, so releasing Shift before a shifted character key cannot strand the interaction. A release with a different kind, code, or button is ignored. Repeated keyboard events do not call `onMapPingStart`. The hook continues suppressing the corresponding browser/game events when the map-ping action consumed them.

### Interaction state

`MapPingInteractionController` is a non-React singleton that owns the small state machine:

```text
idle -> pending -> sent -> idle
               -> wheel-open -> sent -> idle
                             -> cancelled -> idle
```

The controller has the following public interface:

```typescript
begin(input: MapPingInteractionStart): boolean;
updatePointer(position: ClientPoint): void;
complete(identity: MapPingPressIdentity): MapPingSubmission | null;
cancel(): void;
getSnapshot(): MapPingWheelSnapshot | null;
subscribe(listener: () => void): () => void;
```

`begin` rejects a second interaction while one is active. `complete` returns an `attention` submission for a tap, the selected submission for a wheel release, or `null` for an identity mismatch or dead-zone cancellation. It never performs networking. The state contains the captured tile, map ID, logical pointer origin, visual wheel centre, press identity, start time, and selected type. A single timer transitions `pending` to `wheel-open`. Cleanup always clears this timer.

Pure geometry functions resolve the selected type from the pointer angle and dead-zone radius. They are independent of React and the Margonem runtime.

`useMapPings` translates hotkey events into controller calls, turns a returned `MapPingSubmission` into an optimistic marker and socket emission, and installs global pointer-move and cancellation listeners while an interaction is active. `MapPingWheel` subscribes through `getSnapshot` and `subscribe`. `AppContent` wires the lifecycle returned by `useMapPings` into `useHotkeys` and renders one `<MapPingWheel />` beside the other application roots.

`MapChangeProcessor` calls `mapPingInteractionController.cancel()` immediately before `mapPingController.clear()` when `event.town.id` changes. This explicit processor integration is the authoritative map-change cancellation path; no reactive map ID is added to the global store.

### Radial wheel UI

`MapPingWheel` is the only component in its file. It renders through the game-client React tree as a fixed 176 px square overlay with `pointer-events: none`, a z-index consistent with other Lootlog overlays, and semantic styling based on the four-type presentation registry. Four 90-degree segments follow the top/right/bottom/left mapping defined above; each symbol is positioned 56 px from the visual centre. The inactive segment opacity is 70%, while the selected segment uses full opacity, a 2 px white inner outline, and a 1.08 scale. The centre is a 48 px disc that displays the selected translated label or the translated cancellation hint while no segment is selected.

The wheel receives display state and does not send socket events. The interaction controller owns selection and submission. This keeps rendering separate from hotkey and networking behavior.

Static labels and accessibility text use i18n. Although the wheel is primarily pointer-driven, it exposes an appropriate status description in the DOM for assistive tooling and does not rely solely on color.

### Sending and receiving

The existing `useMapPings` flow remains responsible for local validation, optimistic rendering, audio, socket acknowledgement, rejection cleanup, and received events. It resolves the translated type label at insertion time and passes `{ type, typeLabel }` to both `addOptimistic` and `addRemote`.

Sending adds the selected `type` to `MAP_PING_SEND`. Receiving passes the event type to the renderer and selects the matching sound. The sender does not receive its own server event, so optimistic markers remain the sender path.

### Gateway validation

`MapPingService` validates the type against the shared runtime list in addition to validating coordinates. Unsupported or missing types return the existing `invalid-payload` rejection.

The gateway copies the validated type to `MapPingEvent`. Existing permission checks, presence checks, rate limiting, guild eligibility, world filtering, map filtering, sender exclusion, and delivery deduplication remain unchanged.

### Rendering and presentation

A single exhaustive presentation registry maps every `MapPingType` to:

- main color and contrasting text color;
- canvas/minimap symbol drawing strategy;
- duration;
- sound key;
- translation key.

`MapPingController` stores `type` and the already-localized `typeLabel` with each active ping. It does not import or call i18n. Existing active pings retain their insertion-time label if the player changes language during their maximum five-second lifetime; subsequent pings use the new language. This keeps the singleton renderer independent and makes its input fully testable.

Expiry is calculated from the type's duration. The main map renders a pulse, the exact symbol from the product table, the localized type label, and the sender name. The handheld minimap renders the color and symbol without text to avoid clutter.

The registry must be exhaustive at compile time so adding a future type cannot silently fall back to the wrong presentation.

### Sounds

The existing `pings` sound category, `mapPing` URL, and volume controls remain authoritative. No new file or external URL is introduced. The four distinct cues are deterministic playback profiles of the existing short `mapPing` sample, using the rates in the product table with `HTMLMediaElement.preservesPitch = false`.

`playSound` receives an optional playback profile containing `playbackRate` and `preservesPitch`; existing callers keep the current defaults. The contextual-ping presentation registry maps every type to `{ key: "mapPing", playbackRate, preservesPitch: false }`. Tests assert the selected profile and resulting `Audio` properties, so distinctness does not depend on an unspecified asset.

No new settings category or per-type toggle is introduced in this feature.

## Data flow

```text
configured binding pressed over map surface
  -> capture tile and start 300 ms timer
  -> release early: choose attention
  -> hold: show wheel and update angular selection
  -> release with selection
  -> optimistic typed marker + typed sound
  -> MAP_PING_SEND { expectedMapId, x, y, type }
  -> gateway validates context, coordinates, type, permission and rate limit
  -> gateway emits typed MapPingEvent to eligible same-map guild clients
  -> receiver validates world, map, tile and local preference
  -> receiver renders typed marker + typed sound
```

## Error handling

- Invalid target surfaces or tiles never start an interaction.
- A missing socket, disconnected socket, unjoined socket, disabled preference, or non-NI client prevents interaction start.
- A gateway rejection removes the optimistic marker exactly as today.
- Rate-limit and temporary-unavailability hints keep their current throttling.
- A timed-out acknowledgement leaves the already displayed short-lived optimistic marker, matching current behavior.
- Unknown received types are prevented by the shared TypeScript contract; defensive runtime handling drops them rather than rendering a fallback.
- UI timers and global listeners are always removed during cancellation and unmount.

## Testing strategy

### Shared types and gateway

- Gateway accepts all four supported types and includes the type in emitted events.
- Gateway rejects missing and unsupported types as `invalid-payload`.
- Existing context, permission, routing, deduplication, and rate-limit tests continue to pass.

### Hotkeys and interaction

- Keyboard and mouse bindings emit start and matching end phases using captured `code` or `button`, even when modifiers change before release.
- Key repeat and duplicate presses are ignored.
- A release for a different binding does not finish the active interaction.
- A tap sends one `attention` ping.
- Holding for 300 ms opens the wheel without sending.
- Angular movement selects the exact top/right/bottom/left mapping, including all four boundary angles.
- The 24 px dead zone, 88 px visual radius, 12 px viewport margin, and edge clamping preserve logical selection based on movement from the captured press point.
- Dead-zone release, `Escape`, blur, disconnect, map change, preference disable, and unmount cancel without sending.
- Timer and event-listener cleanup are verified with fake timers.

### Networking hook

- Each selected type is included in the outgoing payload.
- Optimistic and remote markers receive the same type.
- The matching sound key is used for local and remote pings.
- Rejection removes the correct optimistic marker.

### Renderer and UI

- Every type resolves to an exhaustive presentation entry.
- Type-specific durations expire at the correct time.
- Main map and minimap use the exact color and symbol from the product table and receive localized labels as data.
- The wheel renders translated labels, uses the specified dimensions and segment order, highlights selection, clamps visually near viewport edges, and does not capture pointer events.
- An `AppContent` integration test proves the hotkey lifecycle and wheel root are wired together.
- A `MapChangeProcessor` test proves a changed `event.town.id` cancels pending/open interaction state and clears rendered markers.

## Rollout and documentation

The feature remains behind the existing `pings.enabled` preference and inherits current gateway authorization. No migration or feature flag is required.

After implementation and verification, `/Users/kamil/Desktop/lootlog-feature-research.md` receives a dated progress entry containing the branch name, commit, delivered scope, verification commands, and any intentionally deferred items.
