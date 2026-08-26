# ADR 0001: Direct reciprocal reservation calendar sharing

- Status: Accepted
- Date: 2026-08-26

## Context

Lootlog Organizations need to coordinate reservation calendars without merging
their administration boundaries. A sharing model must define which
organizations become visible, which reservation fields may cross that boundary,
how conflicts are evaluated, and what revocation does to persisted data.

Transitive sharing would make disclosure depend on another organization's
partners and would make effective access difficult for administrators to
predict. Directional grants would permit asymmetric calendars even though new
reservation conflicts must be checked consistently by both participants.

## Decision

Reservation calendar sharing is a direct, reciprocal relationship between two
Organizations. The relationship is persisted as one canonically ordered pair,
so `(A, B)` and `(B, A)` cannot coexist. Sharing never propagates through a
partner: if A shares with B and B shares with C, A and C do not see or block one
another.

An administrator creates a random, single-use invitation. Only its hash is
stored. It expires after seven days, and an authenticated recipient must choose
an Organization in which they are an owner or administrator. Accepting the
invitation activates the reciprocal relationship. Existing overlaps remain
visible in parallel lanes and do not prevent acceptance; subsequent writes are
checked against every active reservation belonging to either direct partner.

Cross-boundary reservation views expose only the author's display snapshot,
avatar, time range, comment, and the source Organization's presentation data.
They do not expose Discord identifiers or a separate technical Organization
identifier. Each Organization may moderate only reservations it owns; a user
may still cancel their own reservation.

Revocation takes effect immediately for reads, conflict checks, websocket
audiences, and new writes. It does not delete either Organization's
reservations or reminder jobs. Events contain no PII and carry the source
Organization plus an explicitly resolved audience list.

## Consequences

- Effective access can be explained from one direct pair and audited without
  graph traversal.
- Both participants see the same conflict domain while retaining independent
  moderation.
- Disconnecting is safe and reversible because source records remain owned by
  their original Organization.
- Supporting multi-party alliances later would require a separate explicit
  model and migration rather than changing the meaning of this relation.
