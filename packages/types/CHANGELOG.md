# @lootlog/types

## 3.0.0

### Major Changes

- 321b96a: Replace event pin settings with dedicated, permission-aware event pin resources that support vanity guild URLs and concurrent updates safely.
- 4ae5fe2: Remove the development permission override UI, transport contract, and server-side permission substitution so all clients use the standard guild permission model.

## 2.0.2

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.

## 2.0.1

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.

## 2.0.0

### Major Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
