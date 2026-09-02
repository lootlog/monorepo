# @lootlog/nest-shared

## 1.1.0

### Minor Changes

- d597da5: Centralize capability expansion and authorization decisions behind a shared Access policy while preserving deployed permission-array transport contracts. Refresh Docker runtime base layers during builds so deployed images receive current Alpine security packages.

### Patch Changes

- 894dca8: Round-trip the event read cache through superjson instead of a hand-maintained
  list of date field names. `RedisService.getOrSetJson`/`getOrSetJsonBestEffort`
  now accept an optional `codec` so callers can bring their own JSON serializer;
  the default stays `JSON`. The event read cache passes a superjson codec, so any
  `Date` in an event read model survives the cache without being registered
  anywhere. The internal cache key prefix is bumped so stale entries expire on
  their own. No HTTP contract change.
- 0c6ae17: Correct workspace dependency ownership, standardize quality and database command interfaces, and align package build metadata with production artifacts.
- Updated dependencies [d597da5]
- Updated dependencies [0c6ae17]
  - @lootlog/types@3.0.3

## 1.0.10

### Patch Changes

- 2b571ba: Send application telemetry to the self-hosted observability stack, emit
  structured JSON logs with active trace context, and remove the Axiom transport.

## 1.0.9

### Patch Changes

- 42a49c1: Upgrade backend services to NestJS 12 and native ESM builds and tests without SWC.
- Updated dependencies [bf625a4]
  - @lootlog/types@3.0.2

## 1.0.8

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- @lootlog/types@3.0.1

## 1.0.7

### Patch Changes

- Updated dependencies [008ef3f]
  - @lootlog/types@3.0.1

## 1.0.6

### Patch Changes

- Updated dependencies [321b96a]
- Updated dependencies [4ae5fe2]
  - @lootlog/types@3.0.0

## 1.0.5

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/types@2.0.2

## 1.0.4

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [25406a5]
  - @lootlog/types@2.0.1

## 1.0.3

### Patch Changes

- Updated dependencies [9096829]
  - @lootlog/types@2.0.0

## 1.0.2

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/types@1.0.1
