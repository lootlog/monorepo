---
status: accepted
date: 2026-08-21
---

# Discord roles map to Lootlog access policies

## Context

Lootlog stores strategic data such as exact Titan timers and loot records.
Discord already defines Organization membership and role membership, but a
Discord role alone cannot express NPC selectors, level ranges, resource scopes,
or Lootlog capabilities.

Direct per-user grants would create a second authorization mechanism. Such a
grant could remain active after a Discord role change and become difficult for
an Organization administrator to audit.

## Decision

Discord remains the source of Organization membership and role membership.
Lootlog defines access policies for capabilities, NPC selectors, level ranges,
and resource scopes, then maps Discord roles to those policies.

Lootlog does not support direct per-user grants. A mutation on an existing
resource requires both visibility of that resource and the action permission.
The same policy decision applies to source records, aggregates, search,
comments, history, notifications, and realtime events.

During a Discord synchronization outage, the last confirmed state may be used
for a short, visible grace period. High-risk administration requires fresh
verification, and access is suspended after the grace period instead of being
deleted.

## Consequences

- Organization administrators manage access through Discord role mappings and
  Lootlog policies.
- HTTP endpoints, database filters, jobs, and websocket subscriptions need one
  consistent policy model.
- A temporary Discord outage does not immediately remove ordinary access.
- Exceptional access requires a new policy concept rather than a hidden
  per-user override.
