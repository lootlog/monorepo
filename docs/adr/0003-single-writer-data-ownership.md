---
status: accepted
date: 2026-08-21
---

# Each data domain has one writer

## Context

Lootlog deploys Auth, API, Battlelog, Activity, Search, and Gateway
independently. Direct cross-service database writes would couple their releases,
migrations, failure handling, and rollback paths.

Queues and network calls can repeat or arrive late. Search indexes and caches
may also need to be rebuilt after a failure.

## Decision

Each data domain has one writer, as described in `ARCHITECTURE.md`. A service
writes only state that belongs to its domain. Services exchange versioned APIs
or facts rather than reading or mutating another service's database.

Consumers tolerate repeated delivery. Caches, read models, and search indexes
remain rebuildable projections rather than independent sources of truth.

## Consequences

- Cross-domain changes require an explicit contract and coordinated consumer
  migration.
- Each service owns its migrations, retry behavior, and failure recovery.
- Duplicate delivery must not produce duplicate domain effects.
- A new service boundary needs an independent scaling, failure, data, security,
  or release reason that justifies the operational cost.
