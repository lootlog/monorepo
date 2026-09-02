# ADR 0008: Versioned schema-first WebSocket protocol

- Status: Accepted
- Date: 2026-09-01

## Context

Socket.IO exposed framework events and raw room conventions to clients. Presence
did not distinguish reported and verified state, and reconnect behavior was
spread across the gateway and consumers. The target presence model requires
revisions, expiry, permission-aware precision, and cross-instance federation.

## Decision

Replace Socket.IO with a custom WebSocket protocol using MessagePack envelopes:
`ClientCommand`, `Response`, and `ServerEvent`. Version every envelope with
`v`; correlate request and response messages with `requestId`; use monotonic
sequence or revision values where ordered state requires them. Do not use Effect
RPC on the wire.

`RealtimeHub` owns Bun WebSocket integration, logical subscriptions, Redis
federation, deduplication, cross-instance lookup, and bounded backpressure.
Clients use a Promise request API and `subscribe(listener)` for events. They
must reconnect with jitter, authenticate again, rejoin logical scopes, and
resubscribe without sending raw room names.

Authenticate browser upgrades with the first-party session cookie. A
cross-origin game client may exchange its bearer credential for a short-lived,
single-use ticket through the HTTP API. Never place credentials in a WebSocket
query string.

Presence uses a 25-second heartbeat, a 60-second expiry, server-assigned
`lastSeen`, and monotonic snapshot revisions. Basic status and precise location
are separate capabilities. `LOOTLOG_PRESENCE_LOCATION_READ` gates location;
roles that already have `LOOTLOG_ONLINE_PLAYERS_READ` receive an additive
backfill.

## Consequences

- Gateway, Web, and Game Client require one coordinated realtime cutover.
- The protocol can reject malformed and unknown frames before dispatch.
- Backpressure, reconnect, federation, and permission rebalance become explicit
  testable behavior.
- Socket.IO compatibility is not retained for realtime v1.
