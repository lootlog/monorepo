# ADR 0006: Drizzle database access and legacy adoption

- Status: Accepted
- Date: 2026-09-01

## Context

API and Activity used Prisma while Auth and Battlelog used an older Drizzle
release. The services already own separate databases, migrations, transactions,
and operational constraints. Recreating those databases from a new migration
history would risk changing physical schemas or accepting an unexpected legacy
state.

## Decision

Use Drizzle ORM and Drizzle Kit 1.0.0-rc.4 for database-owning services. Use
`drizzle-orm/effect-postgres` with `@effect/sql-pg` for Effect composition.
Search and Discord Bot remain database-free.

Archive legacy migrations as immutable evidence. Before adopting an existing
database, compare its catalog with a checked-in fingerprint covering tables,
columns, types, constraints, indexes, and service-specific extensions. Refuse
adoption on missing, extra, or changed structural objects. Record adoption only
after the fingerprint matches.

Preserve transaction boundaries, explicit locks, effect ordering, compensation
behavior, and physical names. The presence-location permission and its additive
backfill are the only planned API DDL change. Activity must retain its
TimescaleDB hypertable, one-day chunks, seven-day retention, indexes, and
composite keys.

## Consequences

- A migration engine change does not silently become a schema redesign.
- Existing databases need an explicit, fail-closed adoption step.
- Mechanical DDL comparison and legacy fixture reads are release gates.
- Drizzle release-candidate upgrades require coordinated schema and query
  verification.
