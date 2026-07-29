# @lootlog/game-client

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
