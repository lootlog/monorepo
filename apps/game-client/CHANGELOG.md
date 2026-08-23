# @lootlog/game-client

## 1.2.8

### Patch Changes

- 66edca7: Correct mine dialog NPC levels for loot visibility and backfill existing NPC snapshots.

## 1.2.7

### Patch Changes

- 99eb992: Keep the shared timer clock inside live countdown tiles and schedule list removal at the next expiry boundary so one-second ticks no longer repeat list-wide timer work.
- 3c0bfe1: Remove Sentry error monitoring from the game client and its release build.
- 370ca83: Project Margonem events into Lootlog stores after the game handler returns, defer processors through a bounded FIFO queue, and stop inactive player and timer integrations from producing unnecessary work.
- 5231a08: Keep always-visible expired timers ordered at the bottom after the configured removal delay while preserving boundary-only timer list updates.
- a98536a: Batch chat cache ingress once per organization and frame, keep the first NPC report stable while counting matching reports, render incoming messages without moving the history viewport, and prevent content resizes from snapping an explicit upward scroll back to the bottom.
- 4ae5fe2: Remove the development permission override UI, transport contract, and server-side permission substitution so all clients use the standard guild permission model.
- Updated dependencies [321b96a]
- Updated dependencies [4ae5fe2]
  - @lootlog/api-client@5.0.0
  - @lootlog/types@3.0.0

## 1.2.6

### Patch Changes

- Updated dependencies [d782374]
  - @lootlog/api-client@4.0.1

## 1.2.5

### Patch Changes

- Updated dependencies [ed13484]
  - @lootlog/api-client@4.0.0

## 1.2.4

### Patch Changes

- Updated dependencies [c9e3ca1]
  - @lootlog/api-client@3.0.1

## 1.2.3

### Patch Changes

- 0a285b3: Rebuild immutable frontend artifacts with reliable Cloudflare promotion handling.

## 1.2.2

### Patch Changes

- Updated dependencies [3e25d98]
  - @lootlog/types@2.0.2
  - @lootlog/api-client@3.0.0

## 1.2.1

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [5af6865]
- Updated dependencies [5af6865]
- Updated dependencies [5af6865]
- Updated dependencies [25406a5]
  - @lootlog/api-client@3.0.0
  - @lootlog/margonem@1.0.2
  - @lootlog/socket-parser@1.0.2
  - @lootlog/types@2.0.1

## 1.2.0

### Minor Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

### Patch Changes

- 6defdc4: Preserve every inbound runtime packet, share one full-envelope game event processor across overlapping client registrations, deduplicate semantic battle replays, and harden battle creation retries after lock or raw-storage failures.
- Updated dependencies [9096829]
  - @lootlog/api-client@2.0.0
  - @lootlog/types@2.0.0

## 1.1.1

### Patch Changes

- 4b501b7: Prevent repeated Margonem events and equivalent battle submissions from creating duplicated battles or doubled combat statistics.
- Updated dependencies [4b501b7]
  - @lootlog/api-client@1.1.1

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

### Patch Changes

- bddc4c2: Polish server selector states when one or all accessible servers are hidden.
- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/api-client@1.1.0

## 1.0.4

### Patch Changes

- c1ee3a0: Introduce the Resp Orbit brand mark across browser icons, landing metadata, the web app shell, and userscript metadata.
- 9406178: Prevent duplicate game-event side effects when multiple client consumers mount, omit undefined fields from exported diagnostic logs, and keep concurrent loot submissions retryable while their distributed lock is held.
- de6352a: Improve foreground loading, refresh, retry, connection, and centered empty states across timers, online players, chat, selectors, and autocomplete surfaces.

## 1.0.3

### Patch Changes

- 50aa539: Prevent host layout styles from hiding the Margonem loading progress bar.
- 50aa539: Restore context menus on player chat messages.
- 50aa539: Replace the custom chat composer with Lexical to restore native selection, word deletion, history, IME handling, and atomic colored mentions.

## 1.0.2

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/api-client@1.0.1
  - @lootlog/margonem@1.0.1
  - @lootlog/socket-parser@1.0.1
  - @lootlog/types@1.0.1
