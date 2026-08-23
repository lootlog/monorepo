# @lootlog/api-client

## 5.0.0

### Major Changes

- 321b96a: Replace event pin settings with dedicated, permission-aware event pin resources that support vanity guild URLs and concurrent updates safely.

## 4.0.1

### Patch Changes

- d782374: Display event ranking member names using their highest role color.

## 4.0.0

### Major Changes

- ed13484: Rebuild event wrapped as a verified, story-style presentation and expose leader evidence so ambiguous or inconsistent superlatives can be omitted.

## 3.0.1

### Patch Changes

- c9e3ca1: Improve responsive dashboard, kill statistics, and event list/detail cards including event hero navigation, management actions, and level-profession labels, align dashboard navigation, loot filters and empty states, timer controls, metadata, and empty/world-selection states, polish reservation search, list and grid cards with shared interface patterns, and refine platform-aware shortcuts, sidebar density, and pointer focus behavior.

## 3.0.0

### Major Changes

- 5af6865: Embed permission-scoped edit history in the event ranking response and remove the per-ranking history endpoint so the ranking and its histories load in one request.

### Patch Changes

- 5af6865: Show expired participation confirmations once and persist their acknowledgement so they do not repeatedly interrupt event views.
- 5af6865: Enforce event map assignment windows in the API and coordinator UI.
- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.

## 2.0.0

### Major Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

## 1.1.1

### Patch Changes

- 4b501b7: Prevent repeated Margonem events and equivalent battle submissions from creating duplicated battles or doubled combat statistics.

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
