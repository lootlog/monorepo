# 0011. The game client stays inside Margonem's performance budget

Status: accepted

## Context

The game client shares the main thread, the document, the stylesheet and the
render loop with Margonem. A client performance regression is a release
blocker, and many players run without GPU acceleration, where gradients,
blends and canvas readbacks cost an order of magnitude more than flat fills.
Every React render, layout read, style recalc, timer and bundle byte that
Lootlog adds competes with the game's own frames.

React Compiler owns memoization by default. The cases below are measured
exceptions, or invariants that the compiler's memoization depends on.

## Decisions

### Stable identity for long memoized lists

- **`ChatTranscriptRow`** (`apps/game-client/src/features/chat/components/chat-transcript-row.tsx`): is wrapped in `memo` as a measured exception: the transcript renders up to 500 rows, and without it each new message caused about 502 row renders instead of 1. Every row prop must stay referentially stable across ingests.
- **`GlobalChatRow`** (`apps/game-client/src/features/global-chat/components/global-chat-row.tsx`): is memoized for the same measured reason, and message objects keep identity across live appends so it holds.
- **`SingleNotification`** (`apps/game-client/src/features/notifications/components/single-notification.tsx`): is memoized because the window renders up to 50 rows with several Base UI tooltip roots each; this cut row renders per presentation from 41–45 to 1.
- **`shareChatMessages`** (`apps/game-client/src/features/chat/chat-query-cache.helpers.ts`): chat history uses structural sharing matched by message id, because React Query pairs by index and, once a full history drops its oldest message, would rebuild every message and re-render every row.
- **`combineData`** and **`summarizeMessageQueries`** (`apps/game-client/src/features/chat/hooks/use-chat-guild-data.ts`): `useQueries` gets a `combine` so derived per-guild records keep identity until a query changes, while message histories are read straight from the queries because combined results are shared by index.
- **`getStableChatMentionContext`** (`apps/game-client/src/features/chat/hooks/use-chat-guild-data.ts`): returns the previous mention context while its content is unchanged, because every chat row receives it.
- **`getMentionEntities`** (`apps/game-client/src/features/chat/chat-mentions.helpers.ts`): caches mention tables per context object in a WeakMap, because building them per message scales with rows times members.
- **`resolvedReplies`** (`apps/game-client/src/features/chat/chat-reply.helpers.ts`): caches resolved replies in a WeakMap keyed by the source message, so a reply keeps one identity while its source and resolved name are unchanged.
- **`handleReplyToMessage`** (`apps/game-client/src/features/chat/chat-view.tsx`) and **`handleUpdateMutes`** (`apps/game-client/src/features/notifications/components/notifications-list.tsx`): callbacks passed to memoized rows keep identity across unrelated renders; the mutes mutation is read through `updateMutesRef` because its identity is not guaranteed.
- **`selectVisibleNotifications`** (`apps/game-client/src/features/notifications/hooks/use-visible-notifications.ts`): keeps the visible array's identity while its members are the same references in the same order.
- **`useWhoIsHereAirTagEnemies`** (`apps/game-client/src/features/air-tags/use-who-is-here-air-tag-enemies.ts`): compares the shown view through a ref outside `setView`, because even a no-op state updater can re-render the hook.
- **`useReadyRoomInvitations`** (`apps/game-client/src/features/party-finder/hooks/use-ready-room-invitations.ts`): closes `canInviteParticipants` over the subscribed Ready Room cache, socket state and character, because `canEnqueueReadyRoomInvitations` reads them directly and the compiler keys callers' results on function identity; a stable function would freeze the first answer.

### Narrow subscriptions and store writes

- **`AppContent`** (`apps/game-client/src/app-content.tsx`): gates the overlay on `useDeferredValue(gameInitialized)`, because the flag flips inside the game's packet handling and deferring makes the first overlay render interruptible.
- **`SocketProvider`** (`apps/game-client/src/contexts/socket-context.tsx`): reads world, account and character with primitive `useGameStore` selectors, because the game store updates on every hero step.
- **`use-draggable-window-frame.ts`** (`apps/game-client/src/components/draggable-window/use-draggable-window-frame.ts`): each window derives `zIndex` with a primitive selector, so focusing one window does not re-render every other.
- **`reportedPartyMembers`** (`apps/game-client/src/features/party-finder/hooks/use-party-ready-room-observer.ts`): selects only the reported, serialized party fields, because member HP changes every battle turn.
- **`ReadyRoomCharacterSwitch`** (`apps/game-client/src/features/party-finder/components/ready-room-character-switch.tsx`): is a separate leaf so gathering and Ready Room updates re-render only it.
- **`TimersView`** (`apps/game-client/src/features/timers/timers-view.tsx`): filters the grid by a deferred search text, so typing stays immediate and the grid re-filters in an interruptible render.
- **`presence-map-index.ts`** (`apps/game-client/src/lib/presence-map-index.ts`, `apps/game-client/src/lib/players-presence-source.ts`): map occupancy keeps its reference unless what a timer tile shows changes, and subscribers are notified only on occupancy changes.
- **`hasNpcFieldChange`** (`apps/game-client/src/store/npc-detector.store.ts`): keeps the detector array when an update changes no field, because Margonem re-sends known NPCs on rescans and map re-entry.
- **`areNpcSnapshotsEqual`** (`apps/game-client/src/store/npcs.store.ts`): spells out compared fields instead of looping over names, because a keyed load per field goes megamorphic on every NPC of every `npcs` packet.
- **`setTimersStateIfChanged`** (`apps/game-client/src/lib/settings-persistence/use-settings-hydration.tsx`): writes only timer keys whose value changed (deep-equal), because the server may return the same JSON with keys in another order.
- **`createChangedOnlyStorage`** (`apps/game-client/src/store/changed-only-storage.ts`): persisted zustand stores skip writes when the persisted payload is unchanged, because `persist` rewrites storage synchronously after every `set`. The value read at hydration is remembered so a transient-only first set never overwrites another tab's update.
- **`setOpen`** (`apps/game-client/src/store/windows.store.ts`): resolves a no-op outside `set`, so bursts that re-open a focused window do not trigger a persist write.
- **`getSerializedByteLength`** (`apps/game-client/src/store/logs.store.ts`): caches each logged action's byte length, because actions are immutable and the retention pass runs on every write.
- **`pruneByRecency`** (`apps/game-client/src/lib/prune-by-recency.ts`): bounds every per-character, per-room and per-request cache by TTL and then by count, so a long session cannot grow memory without limit.

### Shared popups and windowed rendering

- **`SharedContextMenu`** (`apps/game-client/src/components/common/shared-context-menu.tsx`): lists use one context menu that rows target through `useSharedContextMenuTarget`, because a root per row cost each row its own stores and document listener while a player opens one menu at a time.
- **`ChatTranscriptPopups`**, **`OnlinePlayersPopups`**, **`TimerGridPopups`** and **`SharedCharacterTileTooltip`** (`apps/game-client/src/features/chat/components/chat-transcript-popups.tsx`, `apps/game-client/src/features/online-players/components/online-players-popups.tsx`, `apps/game-client/src/features/timers/components/timer-grid-popups.tsx`, `apps/game-client/src/components/shared-character-tile-tooltip.tsx`): one menu and one tooltip per kind serve a whole list; per-row popup roots made mounting a full transcript several times slower.
- **`TRANSCRIPT_WINDOW_PAGE_SIZE`** (`apps/game-client/src/features/chat/hooks/use-transcript-window.ts`): mounts 50 rows at a time, because mounting all 500 took 317 ms of main thread at 6x CPU slowdown while a screenful is 15–30 rows.

### Layout reads and pointer work

- **`measureWindowViewport`** and **`useWindowViewport`** (`apps/game-client/src/hooks/ui/window-viewport.ts`): reading `visualViewport` or `innerWidth` forces the game document to lay out, so windows measure once per interaction or read one snapshot kept by a single debounced `resize` listener.
- **`DragInfo`** (`apps/game-client/src/hooks/ui/use-drag.ts`): a drag measures the viewport on pointer down and again only when the visual viewport resizes, never per move.
- **`window-resize-handle.tsx`** (`apps/game-client/src/components/draggable-window/window-resize-handle.tsx`): resize previews go through `createFrameCoalescer` (at most once per frame) and measure the viewport once per resize session; the frame measures window chrome height once when a max-height resize begins.
- **`cursor-follower.ts`** (`apps/game-client/src/components/ui/cursor-follower.ts`): cursor tooltips bypass React and Base UI's `trackCursorAxis`, which re-renders and repositions on every mousemove. One passive listener records the pointer, tooltips move by `transform` once per frame, and sizes are cached and refreshed by ResizeObserver.
- **`TooltipContent`** (`apps/game-client/src/components/ui/tooltip.tsx`): a cursor tooltip sets `disableAnchorTracking`, because Base UI repositioning it would fight the follower.
- **`TruncatedText`** (`apps/game-client/src/components/truncated-text.tsx`): measures truncation only on hover, never on render.
- **`notifications-list.tsx`** (`apps/game-client/src/features/notifications/components/notifications-list.tsx`): the FLIP animation runs only for rows inside the viewport, as one transform-only Web Animation each, and reads positions only when the rendered rows change.
- **`ListRowArrival`** (`apps/game-client/src/components/list-row-arrival.tsx`): animates only `opacity` and `transform`, so the effect stays on the compositor; a row replays it by remounting under a new key.
- **`chat-host-runtime-adapter.ts`** (`apps/game-client/src/lib/margonem-runtime/adapters/chat-host-runtime-adapter.ts`): detects replacement of the game's interface by identity polling once per second instead of observing a DOM subtree that changes on every movement.

### Clocks, countdowns and browser timers

- **`useNow`** (`apps/game-client/src/hooks/ui/use-now.ts`): shares one interval per period so callers tick together, stops while the document is hidden, and callers pick the coarsest period their display needs.
- **`NpcNotificationCooldown`** and **`PingBadgeRing`** (`apps/game-client/src/features/npc-detector/components/npc-notification-cooldown.tsx`, `apps/game-client/src/features/pings/ping-badge-ring.tsx`): countdowns run as one Web Animation and a label updated per second boundary, so their lists never re-render during a countdown.
- **`useNpcListLifecycle`** (`apps/game-client/src/features/npc-detector/hooks/use-npc-list-lifecycle.ts`): one timer armed for the nearest deadline expires cooldowns and detection animations.
- **`useHeroSightingsStaleClock`** (`apps/game-client/src/features/timers/components/timer-map-presence-provider.tsx`): does not tick; it advances only when a roaming sighting turns stale, and sets `now` to `Math.max(Date.now(), nextStaleAt)` because timeouts can fire a millisecond early and the clock would never advance again.
- **`sweep`** and **`sweepWhenVisible`** (`apps/game-client/src/features/notifications/hooks/use-visible-notifications.ts`): the cleanup sweep re-arms itself from the live schedule, because an early timeout that removes nothing would otherwise strand notifications; it also sweeps on `visibilitychange`, because background tabs throttle timeouts while fade-outs run on wall-clock time.

### Canvas and aura rendering

- **`TICK`** (`apps/game-client/src/features/character-auras/engine/render.ts`): auras step at 10 fps, matching the game's 120 ms item animations; smooth 60 fps glow looked pasted onto pixel art, and ticking lets frames between ticks only blit buffers.
- **`Snapshot`** and **`Layer.bounds`** (`apps/game-client/src/features/character-auras/engine/layers.ts`): each tick renders body and world/particle buffers once, and frames copy only the drawn bounds, because content covers about a tenth of the layer box.
- **`Aura.paintRevision`** (`apps/game-client/src/features/character-auras/engine/render.ts`) and **`isPainted`** (`apps/game-client/src/features/character-auras/legacy-aura-surface.ts`): SI keeps each aura in its own two canvases, so a frame repaints them only when the revision (ticks and preset changes), the silhouette or the position changed, instead of on every animation frame; the revision is `null` while an admin's summoning runs, because that animates between ticks. A layer is cleared by a resize, which only a new silhouette causes.
- **`GOLDEN_RATIO`** (`apps/game-client/src/features/character-auras/character-aura-renderer.ts`): each new aura's tick phase advances by the golden-ratio fraction, so expensive tick renders spread across frames.
- **`BUILD_BUDGET_MS`** (`apps/game-client/src/features/character-auras/engine/silhouette.ts`): silhouette building is capped at 1 ms per frame; pending builds wait while auras keep their last silhouette.
- **`AuraPreset.lite`** (`apps/game-client/src/features/character-auras/engine/presets/preset.ts`) and **`drawGround`** (`apps/game-client/src/features/character-auras/engine/ground.ts`): lite auras draw body pieces in pixels only, skip the `getImageData` finish and rebuild only on `LITE_STEP` or a sprite, burst or flash change; their ground pieces stay still between ticks so the cache holds.
- **`hasGraphicsAcceleration`** (`apps/game-client/src/features/character-auras/map-aura-mode.ts`): refuses a WebGL context that would fall back to software (`failIfMajorPerformanceCaveat`), and `auto` map-aura mode follows it.
- **`drawDominion`** and **`drawTimeStop`** (`apps/game-client/src/features/character-auras/engine/absolute.ts`, `apps/game-client/src/features/character-auras/engine/chrono.ts`): wide soft fills and the `saturation` blend run only with acceleration; on CPU the map fades to grey instead.
- **`washAround`** and map-scene effects (`apps/game-client/src/features/character-auras/engine/sky.ts`): full-screen effects are limited to a few fills, blits and small rects, never read pixels back or allocate per frame, and the radial wash is one cached sprite plus four flat rects.
- **`tearMap`** (`apps/game-client/src/features/character-auras/engine/glitch.ts`): copies all strips first and draws them back afterwards, so the canvas is read back once per frame.
- **`LightPixels`** and the soft-dot texture (`apps/game-client/src/features/character-auras/engine/paint.ts`): additive single pixels accumulate as premultiplied RGBA and merge at the layer finish; the dot texture uses `willReadFrequently`, because a GPU texture was over ten times slower to read back.
- **`map-ping-controller.ts`** (`apps/game-client/src/features/pings/map-ping-controller.ts`): `renderGroundRing` blurs each ring once into a cached canvas, `frameGeometry` is read once per frame and reused, and `getPlateWidths` caches text widths only after web fonts settle.
- **`BattlePingGlow`** and **`highlightQuickFightButton`** (`apps/game-client/src/features/pings/battle-ping-glow.tsx`, `apps/game-client/src/features/pings/battle-controls.ts`): battle highlights are separate static layers animated only by opacity, because a filter on the game's sprite or button would repaint what the game redraws.

### Stylesheet and style recalculation

- **`HOST_MOUNTED_CLASS_NAME`** (`apps/game-client/src/bootstrap.tsx`): host layout overrides key on the `ll-mounted` body class instead of `body:has(> #lootlog-root)`, because any `:has()` rule re-checks on every subtree the combat renderer inserts.
- **`buttonVariants`** (`apps/game-client/src/components/ui/button.tsx`), **`markThumbFocusVisible`** (`apps/game-client/src/components/ui/slider.tsx`) and **`hasEnabledSwitch`** (`apps/game-client/src/features/settings/components/shared/settings-matrix-row.tsx`): states that would need `:has()` are expressed with negative margins, a mirrored `data-focus-visible` attribute, or a JavaScript decision.
- **`SettingsList`** (`apps/game-client/src/features/settings/components/shared/settings-list.tsx`): `SettingsListRow` draws its own hairline, so no rule has a universal `> *` subject.
- **`UnderBagTimers`** (`apps/game-client/src/features/timers/under-bag-timers.tsx`): applies `contain: layout style` to its portal, so ticking timers keep layout and style work inside that subtree.
- **`use-who-is-here-lootlog-highlight.ts`** (`apps/game-client/src/hooks/game-events/use-who-is-here-lootlog-highlight.ts`): row highlights are written only when they change, because `classList` and `style` writes rewrite the game's attributes even with an unchanged value.

### Idle, startup and bundle cost

- **`syncTicker`** (`apps/game-client/src/features/loot-split/loot-split-store.ts`), **`usePings`** (`apps/game-client/src/features/pings/use-pings.tsx`) and **`ConnectionStatus`** (`apps/game-client/src/features/quick-access/components/connection-status.tsx`): intervals, mousemove tracking and latency probes (`LATENCY_PROBE_INTERVAL_MS`) run only while a split is listed, a ping surface is enabled, or the status popup is visible.
- **`getBuildTimestampFormatter`** (`apps/game-client/src/features/settings/components/information/information-settings-tab.tsx`): `Intl.DateTimeFormat` instances are built lazily with `once`, because constructing one loads locale data during the game's startup.
- **`settings-content.tsx`** (`apps/game-client/src/features/settings/settings-content.tsx`): the `debug` subsection maps to `import.meta.env.DEV ? DebugTab : () => null`, and the runtime registry (`SETTINGS_DOMAIN_ICONS`) lives apart from the data-only manifest, so search does not pull every subsection into its module graph.
- **`debug-tab.tsx`** (`apps/game-client/src/features/settings/components/debug/debug-tab.tsx`): module-level values such as `DETECTOR_NPC_ENTRIES` stay free of property reads and unannotated calls so production can drop the module, and `registerDebugTranslations` adds debug strings only on first render.

### Diagnostics report privacy

- **`createDiagnosticsReport`** (`apps/game-client/src/lib/diagnostics-report.ts`): the report players paste into public bug reports carries only build, installation and connection state; `describeEndpoint` and `redactPath` reduce endpoints to host and route template, replacing every segment with a digit by `:id`, and identities, tokens, cookies, query strings and bodies are left out.

## Consequences

- Every prop of a memoized row and every cached derived object must keep its identity; a change that rebuilds one silently restores hundreds of renders per message.
- New lists share popups and window their rows instead of mounting a root per row.
- Layout reads, `:has()`, universal selectors and per-frame allocation or readback are off limits on hot paths; reviewers check for them.
- Aura and ping effects need a cheap path for players without GPU acceleration.
- Performance claims here come from measurements; a change that relaxes one re-measures it.
