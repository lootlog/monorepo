# @lootlog/api

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/nest-shared@1.0.2

## 1.0.2

### Patch Changes

- 9406178: Prevent duplicate game-event side effects when multiple client consumers mount, omit undefined fields from exported diagnostic logs, and keep concurrent loot submissions retryable while their distributed lock is held.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/api-helpers@1.0.1
  - @lootlog/instrumentation@0.0.1
  - @lootlog/nest-shared@1.0.1
  - @lootlog/types@1.0.1
