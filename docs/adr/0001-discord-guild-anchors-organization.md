---
status: accepted
date: 2026-08-21
---

# A Discord guild anchors one Lootlog organization

## Context

Lootlog communities already organize on Discord. One community may contain
several Margonem clans, worlds, alliances, and players without a Margonem clan.
Modeling a Lootlog organization independently would introduce a second
membership authority and an additional onboarding step.

The existing code uses `Guild` for the persisted Discord concept. User-facing
copy has historically used "klan" for both Discord communities and Margonem
clans, which makes the boundary ambiguous.

## Decision

One Lootlog Organization corresponds to exactly one Discord guild. Discord is
the source of Organization membership.

An Organization may contain multiple Margonem clans, worlds, alliances, and
players without a clan. Code may retain `Guild` for the persisted Discord
concept. User-facing copy uses the server name, "serwer Discord", or
"organizacja Lootloga" for the Organization and reserves "klan" for a Margonem
clan.

## Consequences

- A leader creates an Organization by adding and configuring the Lootlog bot on
  a Discord server.
- Existing Discord members discover the Organization after signing in; they do
  not join it again in Lootlog.
- Features, data, cache keys, events, and permissions must preserve the Discord
  guild boundary.
- Lootlog cannot represent an Organization spanning multiple Discord servers
  without replacing this decision.
