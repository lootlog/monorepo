# @lootlog/battlelog-service

## 0.0.8

### Patch Changes

- Updated dependencies [321b96a]
- Updated dependencies [4ae5fe2]
  - @lootlog/types@3.0.0
  - @lootlog/nest-shared@1.0.6

## 0.0.7

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/nest-shared@1.0.5
  - @lootlog/types@2.0.2

## 0.0.6

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [25406a5]
  - @lootlog/battle-processor@1.0.2
  - @lootlog/instrumentation@0.0.2
  - @lootlog/nest-shared@1.0.4
  - @lootlog/types@2.0.1

## 0.0.5

### Patch Changes

- c95e8ff: Redesign the documentation with the Lootlog Night Ink reading experience, static search, revised navigation, and clearer onboarding content.

  Keep generated battle panel audit pages compatible with the documentation page title layout.

- 6defdc4: Preserve every inbound runtime packet, share one full-envelope game event processor across overlapping client registrations, deduplicate semantic battle replays, and harden battle creation retries after lock or raw-storage failures.
- Updated dependencies [9096829]
  - @lootlog/types@2.0.0
  - @lootlog/nest-shared@1.0.3

## 0.0.4

### Patch Changes

- 4b501b7: Prevent repeated Margonem events and equivalent battle submissions from creating duplicated battles or doubled combat statistics.

## 0.0.3

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/nest-shared@1.0.2

## 0.0.2

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/battle-processor@1.0.1
  - @lootlog/instrumentation@0.0.1
  - @lootlog/nest-shared@1.0.1
  - @lootlog/types@1.0.1
