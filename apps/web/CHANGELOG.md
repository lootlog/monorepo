# @lootlog/web

## 1.2.2

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/datetime@1.0.1
  - @lootlog/scoring@1.0.1
  - @lootlog/types@2.0.2
  - @lootlog/api-client@3.0.0

## 1.2.1

### Patch Changes

- 5af6865: Show expired participation confirmations once and persist their acknowledgement so they do not repeatedly interrupt event views.
- 5af6865: Enforce event map assignment windows in the API and coordinator UI.
- 5af6865: Unify player tiles across events and loot views and restore player hover tooltips.
- 5af6865: Embed permission-scoped edit history in the event ranking response and remove the per-ranking history endpoint so the ranking and its histories load in one request.
- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [5af6865]
- Updated dependencies [5af6865]
- Updated dependencies [5af6865]
- Updated dependencies [25406a5]
  - @lootlog/api-client@3.0.0
  - @lootlog/socket-parser@1.0.2
  - @lootlog/types@2.0.1
  - @lootlog/ui@2.0.1

## 1.2.0

### Minor Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

### Patch Changes

- e1e6c48: Refine the loot filters layout and search density, stabilize the search dialog height, center its feedback states, improve loot header and footer alignment, truncate long locations, prevent quick-filter layout shifts, keep the search divider visible, expand the world selector, and redesign the sidebar account control with a full-width menu and shared logout action.
- Updated dependencies [9096829]
  - @lootlog/api-client@2.0.0
  - @lootlog/types@2.0.0
  - @lootlog/ui@2.0.0

## 1.1.1

### Patch Changes

- Updated dependencies [4b501b7]
  - @lootlog/api-client@1.1.1

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/api-client@1.1.0

## 1.0.2

### Patch Changes

- c1ee3a0: Introduce the Resp Orbit brand mark across browser icons, landing metadata, the web app shell, and userscript metadata.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/api-client@1.0.1
  - @lootlog/socket-parser@1.0.1
  - @lootlog/types@1.0.1
  - @lootlog/ui@1.0.1
