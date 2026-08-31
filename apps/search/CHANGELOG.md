# @lootlog/search

## 1.0.11

### Patch Changes

- 2b571ba: Use unit-aware HTTP latency histogram buckets for accurate duration percentiles.
- 2b571ba: Exclude health probes from HTTP telemetry and identify each service replica in
  exported OpenTelemetry resources.
- 2b571ba: Send application telemetry to the self-hosted observability stack, emit
  structured JSON logs with active trace context, and remove the Axiom transport.
- Updated dependencies [2b571ba]
- Updated dependencies [2b571ba]
- Updated dependencies [2b571ba]
  - @lootlog/instrumentation@0.0.4
  - @lootlog/nest-shared@1.0.10

## 1.0.10

### Patch Changes

- 42a49c1: Upgrade backend services to NestJS 12 and native ESM builds and tests without SWC.
- Updated dependencies [bf625a4]
- Updated dependencies [42a49c1]
  - @lootlog/types@3.0.2
  - @lootlog/nest-shared@1.0.9
  - @lootlog/instrumentation@0.0.3

## 1.0.9

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- 02813db: Remove vulnerable build tooling from production images and update transitive runtime dependencies to patched releases.
- Updated dependencies [7742f4f]
- Updated dependencies [f0a1338]
  - @lootlog/instrumentation@0.0.3
  - @lootlog/nest-shared@1.0.8
  - @lootlog/types@3.0.1

## 1.0.8

### Patch Changes

- Updated dependencies [008ef3f]
  - @lootlog/types@3.0.1
  - @lootlog/nest-shared@1.0.7

## 1.0.7

### Patch Changes

- 921b7fe: Run the Nest Swagger compiler plugin against the TypeScript 6 compatibility API so SWC metadata generation continues to work when the workspace uses TypeScript 7.

## 1.0.6

### Patch Changes

- Updated dependencies [321b96a]
- Updated dependencies [4ae5fe2]
  - @lootlog/types@3.0.0
  - @lootlog/nest-shared@1.0.6

## 1.0.5

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/nest-shared@1.0.5
  - @lootlog/types@2.0.2

## 1.0.4

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [25406a5]
  - @lootlog/instrumentation@0.0.2
  - @lootlog/nest-shared@1.0.4
  - @lootlog/types@2.0.1

## 1.0.3

### Patch Changes

- Updated dependencies [9096829]
  - @lootlog/types@2.0.0
  - @lootlog/nest-shared@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/nest-shared@1.0.2

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/instrumentation@0.0.1
  - @lootlog/nest-shared@1.0.1
  - @lootlog/types@1.0.1
