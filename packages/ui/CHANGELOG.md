# @lootlog/ui

## 3.0.0

### Major Changes

- da456cf: Migrate the shared UI primitives and their consumers from Radix UI and Vaul to Base UI while preserving the existing visual design.

### Patch Changes

- eaecbd3: Fix separator dimensions by matching Base UI's orientation data attribute.

## 2.0.2

### Patch Changes

- d782374: Standardize expanded table detail rows on a shared, brighter muted surface across Lootlog tables.

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

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
