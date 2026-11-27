# 0012. Game client UI coexists with Margonem and keeps stored preferences

Status: accepted

## Context

Lootlog windows, bars and hotkeys float over Margonem's interface. Margonem
reads keys from a bubbling document listener that ignores modifiers, and acts
on Escape from any focused element, where its first action refuses pending
loot. Lootlog must keep its keys away from the game and never take focus on
its own.

Player settings live in local storage and in versioned server documents
written by every earlier release, by other devices and by add-ons. Stored
userscript preferences are a compatibility contract: readers must keep
decoding old shapes, migrations must preserve what players saw, and
concurrent writers must not overwrite each other.

## Decisions

### Keyboard and focus

- **`useHotkeys`** (`apps/game-client/src/features/hotkeys/use-hotkeys.tsx`): listens in the window capture phase and `consumeKey` calls `preventDefault` and `stopImmediatePropagation`, because Margonem would otherwise also act on the key (Shift+S would walk the hero south).
- **`useHotkeys`** (`apps/game-client/src/features/hotkeys/use-hotkeys.tsx`): reads handlers through `handlersRef`, because reinstalling listeners mid-press would cancel a held ping; keyup also listens in capture, because focused editors stop bubbling and a held ping must still end.
- **`isRecordingBinding`** (`apps/game-client/src/features/hotkeys/use-hotkeys.tsx`): hotkeys ignore keydown while a binding is being recorded, so the key becomes the new binding.
- **`CommandOverlay`**, **`ConfirmPopover`** and draggable windows (`apps/game-client/src/features/command/components/command-overlay.tsx`, `apps/game-client/src/components/confirm-popover.tsx`, `apps/game-client/src/components/draggable-window/use-draggable-window-frame.ts`): stop propagation of key presses, because Margonem handles every non-text-field key (Enter opens chat, digits use skills, Escape refuses loot). `ConfirmPopover` therefore handles Escape itself.
- **`TimerListsPopover`** (`apps/game-client/src/features/timers/components/timer-lists-popover.tsx`): stops every key except Escape, because keys bubbling through the portal reach the context menu's typeahead, while Escape must reach the popover's own listener.
- **`use-character-tooltip-catching-guilds.ts`** (`apps/game-client/src/hooks/game-events/use-character-tooltip-catching-guilds.ts`): Shift mode listens to `keydown` in bubble and `keyup` in capture, so Shift inside Lootlog editors is ignored but a release still ends the mode after Shift+S focuses the console.
- **`use-draggable-window-frame.ts`** (`apps/game-client/src/components/draggable-window/use-draggable-window-frame.ts`) and **`windows.store.ts`** (`apps/game-client/src/store/windows.store.ts`): only windows the player opened request focus; focus requests are never persisted and the `command` window is always restored closed, so a reload or an automatic window never pulls focus from the game.
- **`focusNextToggle`** (`apps/game-client/src/features/quick-access/components/quick-access-collapse-button.tsx`) and **`SetupChecklistButton`** (`apps/game-client/src/features/setup-checklist/components/setup-checklist-button.tsx`): move focus or open a popover only after a press, never on load.

### Window and bar placement

- **`CommandOverlay`** (`apps/game-client/src/features/command/components/command-overlay.tsx`): the console is a non-modal top-center overlay, not a draggable window, because it is summoned for one line and has no position, size or opacity to persist.
- **`QuickAccess`** (`apps/game-client/src/features/quick-access/quick-access.tsx`): keeps one row of tiles and grows only in width, because players tuck the bar under Margonem's top bar.
- **`window-default-placement.ts`** (`apps/game-client/src/components/draggable-window/window-default-placement.ts`): defaults assume Margonem's HUD (the `GAME_*` bar and column sizes) and a camera centered on the hero, and `resolveDefaultWindowPosition` depends only on sizes and the viewport, so a window always opens in the same place.
- **`useWindowDisplayPosition`** (`apps/game-client/src/components/draggable-window/use-window-display-position.ts`): only a drag or explicit action saves a position; saved positions are clamped for display only, so a briefly smaller browser never rewrites them and a locked window cannot be stranded off-screen.
- **`useDrag`** (`apps/game-client/src/hooks/ui/use-drag.ts`): `onDragStop` reports a position only when the element moved, so a click never turns a default position into a saved one.
- **`cursor-tooltip-placement.ts`** (`apps/game-client/src/components/ui/cursor-tooltip-placement.ts`): uses a local `clamp` instead of `es-toolkit`'s, because a tooltip larger than the viewport inverts the range and must collapse onto the padded top-left.

### Notification lifecycle

- **`getNotificationAutoHideDeadlineMs`** (`apps/game-client/src/features/notifications/notification-auto-hide.ts`): falls back to the arrival time, not now, when no auto-hide state was stored, so the countdown ring and the cleanup sweep share one deadline.
- **`SingleNotification`** (`apps/game-client/src/features/notifications/components/single-notification.tsx`): starts its auto-hide bar from the remaining time to the stored deadline, because the sweep removes the row at that deadline even after the category duration changed.
- **`useVisibleNotifications`** (`apps/game-client/src/features/notifications/hooks/use-visible-notifications.ts`): arms one timeout for the nearest deadline and reads the latest schedule from a ref, so later arrivals do not re-arm it.
- **`useNotificationPresenter`** (`apps/game-client/src/features/notifications/hooks/use-notification-presenter.ts`): plays no sound for a report that joins a listed row, because detector auto-send would replay it every few seconds.
- **`NotificationGoingButton`** (`apps/game-client/src/features/notifications/components/notification-going-button.tsx`): withdrawing "I'm going" targets every report of the NPC that lists the user (`selectUserGoingNotificationIds`), because the player may have answered a different report.
- **`NpcListItem`** (`apps/game-client/src/features/npc-detector/components/npc-list-item.tsx`): `handleSendNotification` marks an alert sent even when publishing it to chat fails, because the alert was accepted and another would re-alarm recipients.

### Acting only on loaded preferences

- **`useGuildTargets`** (`apps/game-client/src/hooks/use-guild-targets.ts`): returns no targets until both Lootlogs and the preferences that hide some of them have loaded.
- **`use-current-game-account-notification-settings.tsx`** (`apps/game-client/src/hooks/use-current-game-account-notification-settings.tsx`): notification delivery is ready only after preferences load, deliberately not on `query.isError`, so a failed fetch never delivers muted notifications.
- **`useThemeSync`** (`packages/ui/src/themes/theme-sync.ts`): writes the cached custom theme only once the list or a copy is known, so an unloaded list never erases the copy that paints the next start.

### Decoding stored values

- **`looseStruct`** and **`optionalOrUndefined`** (`packages/schema/src/stored-value.ts`): unknown keys are kept, because other releases and add-ons write them, and an invalid field reads as `undefined` so it falls back to its default without discarding its neighbours.
- **`decodeTimerSettings`** (`packages/schema/src/timer-settings.ts`): must keep reading timer settings written by every earlier release, from local storage and server documents alike.
- **`settings-documents.ts`** (`packages/domain/src/settings-documents.ts`): validators check document shape only, because legacy documents were backfilled from lenient storage; leaf normalization stays with consuming features.
- **`getNumber`** (`apps/game-client/src/lib/api/generated-helpers.ts`) and **`normalizeSoundCategoryConfig`** (`apps/game-client/src/lib/settings-persistence/use-sound-settings.ts`): keep coercing numeric strings and dropping non-object entries, because legacy settings still carry them.
- **`settingsDocumentsSchema`** (`apps/game-client/src/lib/settings-persistence/settings-documents.ts`): the client caches documents in wire form, so it validates against `Schema.toEncoded` of the shared contract.
- **`markSeen`** (`packages/changelog/src/changelog.ts`): keeps seen ids it does not recognise, so an older build cannot mark them unread.
- **`showAllGuilds`** (`packages/domain/src/guild-preferences.ts`): keeps hidden ids of Lootlogs the User lost access to, so regaining access restores the hide choice.
- **`activityFeed.excludedGuildIds`** (`packages/domain/src/settings-documents.ts`): stores exclusions, so new Lootlogs and NPC groups appear by default.

### Migrating stored preferences

- **`settings-documents.ts`** (`packages/domain/src/settings-documents.ts`): the version 1 migration hides `EVENT_HERO` for players who hid `HERO`, and merges per-type notification lists into one `presentation.guildIds` union, so players keep every notification they received.
- **`normalizeNotifications`** (`packages/domain/src/account-preferences.ts`): reads the version 2 document only, and unset `EVENT_HERO` notification and detector fields (and `HERO_TRACKER` detector fields) default to the `HERO` setting, because those NPCs used to behave as heroes.
- **`withNewNpcTypes`** (`apps/game-client/src/store/timers.store.ts`): stored timer filters gain each NPC type once, in the version that introduced it; event heroes inherit the hero filter and Hero Tracker timers are shown.
- **`settings-tabs.ts`** (`apps/game-client/src/constants/settings-tabs.ts`): retired tab ids stay in `LEGACY_SETTINGS_TAB_VALUES` and resolve to their old destination, and `SETTINGS_SUBSECTION_DOMAINS` resolves the domain from the subsection, because stored paths may name an earlier owner.
- **`migrateSettingsTabToPath`** (`apps/game-client/src/store/windows.store.ts`): the stored `appearance` tab keeps pointing at chat appearance, which moved into the chat domain in version 14.
- **`chat.store.ts`** (`apps/game-client/src/store/chat.store.ts`): migrates on read, mapping retired `npc` and `party` filters to `reports` and reading the old per-character selected Lootlog once through `readLegacySelectedGuild`.
- **`LEGACY_PREFERENCES_KEYS`** (`apps/game-client/src/features/backend-preferences-warning/backend-preferences-warning.tsx`): the warning that legacy local settings were not carried over appears only when those keys hold settings; an empty `{"state":{}}` lost nothing.
- **`planSettingsImport`** (`apps/game-client/src/lib/settings-persistence/settings-import.ts`): the one-time import of browser-only settings sends a value only when the server still has the catalog default and the local value differs; it waits for guild documents too, so a server guild list wins over a stale local copy.
- **`useUpdateSoundSettings`** (`apps/game-client/src/lib/settings-persistence/use-sound-settings.ts`): master volume and mute stay on the device; every other sound setting is stored on the server.

### Concurrent writes to settings documents

- **`syncTimerSettings`** (`apps/game-client/src/store/timer-settings-sync.ts`): the server applies `set` per leaf path, so removed keys of record fields (`APPEARANCE_MAP_FIELDS`) go out as `unset`, each custom list is written only through its own paths (`syncCustomList`), and `npcNames` is one leaf because monster names may contain dots.
- **`expectedUpdatedAt`** (`packages/schema/src/settings-documents.ts`): a patch may carry the version it read (or `null` for none) and fails with 409 on change; omitting it merges by path.
- **`applyOperations`** (`apps/api/src/settings-documents/settings-documents.repository.ts`): locks documents ordered by domain, scope type and scope id to avoid deadlock, migrates a document to the catalog version before patching, moves `updatedAt` forward by at least 1 ms per write, and returns early on an empty batch whose lock predicate would match every document.
- **`applyOperations`** (`apps/api/src/settings-documents/settings-documents.service.ts`): authorizes every scope before writing a multi-guild batch in one transaction.
- **`patchPreferences`** (`apps/api/src/settings-documents/settings-documents.service.ts`): validates the client's read context before the write, so a rejected context cannot fail a committed patch.
- **`user-preferences.data-layer.ts`** (`apps/api/src/users/user-preferences.data-layer.ts`): preference patches write only the sent leaves inside the document transaction, so a concurrent change to another field survives.
- **`user-themes-data.ts`** (`apps/api/src/users/user-themes-data.ts`): `share` sets a token only when none exists so concurrent requests get one link, `create` serializes one User's creates against `CUSTOM_THEME_LIMIT`, and `delete` of a selected theme leaves the User on its base look.

### Startup and bootstrap

- **`boot-start.ts`** (`apps/game-client/src/boot-start.ts`): stays the first import of every entry point, so it records `script-start` before the bundle evaluates.
- **`getGameClientBootstrap`** (`apps/api/src/http-api/handlers/users/game-client-bootstrap.operations.ts`): every part runs the operation of the endpoint it replaces, so it applies that endpoint's access policy; `orUnavailable` returns a failed part as null and `guildPermissions` omits a failed guild, so the client reads it from its own endpoint.
- **`useGameClientBootstrap`** (`apps/game-client/src/hooks/use-game-client-bootstrap.ts`): is called before the startup query hooks, so its request leaves first and they wait for it.
- **`game-client-bootstrap.ts`** (`apps/game-client/src/lib/game-client-bootstrap.ts`): the request times out after `BOOTSTRAP_REQUEST_TIMEOUT_MS` (10 s) so queries fall back to their own fetches, and its answer never replaces cache data written after it left.

### Character aura synchronisation

- **`characterAuraKey`** (`apps/game-client/src/features/character-auras/character-aura-targets.ts`): combines account and character id, because Margonem character ids repeat across accounts.
- **`applyCharacterAuraChanges`** (`apps/game-client/src/features/character-auras/character-aura-changes.ts`): patches the cache with each change's full auras so redelivery is idempotent, maps unknown auras to none, and ignores changes when nothing is cached.
- **`use-character-auras.ts`** (`apps/game-client/src/features/character-auras/hooks/use-character-auras.ts`): refetches every `AURAS_REFRESH_INTERVAL_MS` (5 min) to recover changes lost while disconnected, and installs the tooltip overlay in an effect declared before the one that applies targets.

## Consequences

- Every Lootlog surface that accepts keys must stop them from reaching Margonem and handle Escape itself.
- A new window or popover must not take focus unless the player opened it.
- A change to any stored shape needs a migration that preserves what players saw, and readers keep decoding every earlier shape indefinitely.
- Settings writes are per leaf path or version-checked; whole-document overwrites are a defect.
- Features that act on preferences wait for them to load and do nothing on failure.
