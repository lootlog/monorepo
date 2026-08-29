# ADR 0002: Global loot with Organization-owned records

- Status: Accepted
- Date: 2026-08-29

## Context

The same Margonem drop can be submitted concurrently by several players who
belong to different Lootlog Organizations. The previous model attached tenant
visibility directly to submissions. Historical imports also created duplicate
global loot rows and later repaired visibility with dummy submissions. As a
result, evidence, visibility, comments, archival state, and the global loot
allocation did not have clear ownership.

Copying the complete loot or its allocation into every Organization would make
tenant queries simple, but would duplicate high-volume facts and permit the
copies to diverge. Keeping submissions as the tenant boundary would continue to
make an observation carry unrelated lifecycle responsibilities.

## Decision

A `Loot` is one global immutable drop with global item, NPC, player, and
allocation facts. Each Organization associated with it owns one physical
`OrganizationLootRecord`, unique by `(guildId, lootId)`. The record owns archive
state, comments, submissions as observation evidence, and future settlement
state. Archiving hides only that Organization's record and never deletes or
changes the global loot.

All historical submissions are retained. Migration creates records from every
distinct Organization/loot pair found in submissions or comments, including
comment-only pairs, and then reparents the evidence. Global loot rows without
either relationship remain intentionally unassociated and are handled by a
separate cleanup operation.

Loot visibility requires an active Organization record and complete coverage of
every associated NPC. Each NPC must match the level range and tier permissions
of at least one complete role grant. `OWNER` bypasses this check; `ADMIN` does
not. Missing NPC facts fail closed. The same policy module drives in-memory
websocket decisions, while equivalent adapters express it for Prisma and SQL
aggregates.

Allocation messages may be submitted only by an internal user with recent
submission evidence. The first chat-derived result supersedes weaker inferred
sources. Repeated identical chat results are idempotent; a different chat result
is rejected as a conflict and diagnostics retain hashes rather than chat text.

## Consequences

- Tenant lifecycle and authorization no longer depend on synthetic evidence.
- Global loot and allocation storage are not multiplied by Organization count.
- Comments, archival state, statistics, caches, and events have an explicit
  Organization boundary.
- Reads require an additional Organization record relation, offset by indexes
  designed for active tenant pagination and aggregation.
- The backfill rewrites all submissions and comments and requires capacity for
  temporary indexes, WAL, and table bloat during rollout.
- The maintenance cutover must stop API loot publishers, gateway loot
  consumers, and notification consumers. Purge
  `backend-notifications-loot-created`, plus the main, retry, and dead-letter
  queues for both gateway loot event families:
  `gateway-guilds-loots-create`, `gateway-guilds-loots-create.retry`,
  `gateway-guilds-loots-create.dlq`, `gateway-guilds-loots-share-update`,
  `gateway-guilds-loots-share-update.retry`, and
  `gateway-guilds-loots-share-update.dlq`. Then start API instances publishing
  `LootCreatedNotificationEventV2`, `GuildLootCreatedEventV2`, and
  `GuildLootShareUpdatedEventV2`, followed by their consumers. V1 events are not
  accepted after the cutover.
- Removing unassociated global loot is a separate, auditable maintenance task.
