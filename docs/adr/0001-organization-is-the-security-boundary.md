# 0001. The Organization is the security boundary

Status: accepted

## Context

Lootlog serves competing player factions from the same deployment. Timers,
loot records, sightings, and chat are tactical information: one faction seeing
another's data is the most damaging failure the product can have short of
losing the data.

A faction already has an identity outside Lootlog. It runs a Discord server,
and membership and roles on that server decide who belongs and who leads.

## Decision

The Organization is the top-level tenant and the unit of isolation. Each
Organization is anchored to exactly one Discord guild, and a User is a Member
of an Organization only while their Discord membership places them there.
Discord is the only sign-in provider.

The Organization scopes everything derived from a record, not only the record:
queries, aggregates, cache and idempotency keys, jobs, events, socket rooms,
search projections, comments, history, notifications, exports, and telemetry.
A mutation on an existing resource requires both visibility of the source
record and the relevant Capability. A derived view never reveals metadata that
the source policy hides.

Domain contracts identify a person by the internal User identifier. The
Discord identifier stays at the authentication and synchronization boundary.

## Consequences

- Access is revoked by a Discord change, without a Lootlog administrator.
- Every new read path, including aggregates and realtime delivery, has to
  apply the source policy. A feature that works for base records but leaks
  through a count, a search result, or a socket room is incomplete.
- Cross-Organization features need an explicit sharing model instead of a
  wider query.
- Lootlog depends on Discord for identity and membership. An Organization
  cannot exist without a Discord guild.
