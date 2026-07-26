# @lootlog/game-client

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
