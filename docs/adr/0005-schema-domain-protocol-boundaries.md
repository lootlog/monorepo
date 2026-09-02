# ADR 0005: Schema, domain, and protocol package boundaries

- Status: Accepted
- Date: 2026-09-01

## Context

`@lootlog/types` mixed browser data, runtime validation, domain decisions, and
transport payloads. Small packages such as access policy, loot visibility,
reservations, and scoring split one domain model across unrelated import paths.
RabbitMQ and realtime contracts were also owned by transport implementations.

## Decision

Use four boundaries:

- `@lootlog/schema` owns browser-safe data schemas and shared value types.
- `@lootlog/domain` owns pure decisions such as access policy, visibility,
  reservations, settings resolution, and scoring.
- `@lootlog/protocol` owns versioned HTTP, RabbitMQ, OpenAPI, and realtime wire
  contracts.
- `@lootlog/messaging` owns AMQP transport and resource lifecycle behavior.

`@lootlog/client` is the generated HTTP adapter. Orval generates one file for
each independent OpenAPI service with `mode: "single"`; each file exposes raw
Promise functions and TanStack Query helpers. Browser packages must not import
backend-only modules through any of these packages.

## Consequences

- Wire changes can be reviewed separately from domain-policy changes.
- Browser-safety checks have a small, explicit package surface.
- Five OpenAPI services produce five generated files instead of per-tag and
  per-model trees.
- `@lootlog/types` and the replaced micro-packages are removed after all
  consumers use the new subpath exports.
