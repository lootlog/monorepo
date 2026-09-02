# Bun, Effect, and Drizzle rewrite report

Baseline behavior is pinned to
`633f8f0157cca04ef2b609ba0e2f1903b1c28949`. The live implementation ledger is
[`status.md`](status.md); this report records only evidence already reproduced
on the rewrite branch.

## Verified results

- Bun `1.4.0` performs a frozen isolated workspace install, and the imported
  dependency graph retains every normalized package identity from the pnpm
  baseline.
- Five OpenAPI specifications expose 244 operation IDs: API 199, Activity 9,
  Auth 5, Battlelog 26, and Search 5. The sole additive operation issues the
  short-lived one-time realtime ticket required by the coordinated WebSocket
  cutover; the other 243 operation IDs remain unchanged.
- The official Effect OpenAPI generator deterministically renders the API's
  schema-first `HttpApi` contract as one 1,012,847-byte source file containing
  exactly the same 199 operation IDs. The guarded generator validates the full
  identifier set, deduplicates identical generated components, preserves the
  legacy parameter and model-name representation consumed by Orval, and then
  atomically replaces the output. The normalized operation parity gate passes
  for all 243 baseline operations plus the allowlisted realtime ticket.
- Orval uses `mode: "single"` and emits one generated TypeScript file for each
  independently hosted OpenAPI document: five files instead of 1,176. Repeated
  generation after the ticket addition is deterministic.
- Browser bundling succeeds for Schema, Domain, Protocol, Messaging, and all
  five generated client entries.
- Auth, Search, Discord Bot, Activity, Battlelog, and Gateway have Bun/Effect
  application slices with passing local lint, typecheck, test, and build gates.
- Realtime v1 passes a real Redis verification with two independent hubs,
  source exclusion, federation, reconnect/resubscribe, one-time ticket
  consumption, map-ping and air-tag TTL, deduplication, and rate limits. Web,
  Game Client, Protocol, Gateway, Auth, and Client gates pass without active
  Socket.IO imports.
- The local seed CLI no longer imports Prisma. A fresh PostgreSQL verification
  exercised cleanup plus Drizzle inserts for organizations, roles, members, and
  timers.
- API production queries and the complete E2E database harness no longer import
  Prisma. The legacy API suite passes 1,060 tests, while 16 real PostgreSQL and
  Redis E2E suites pass 95 tests through `ApiDatabaseLive` and Drizzle.
- API Prisma runtime and tooling have been removed. The legacy schema and 139
  migrations remain archived under Drizzle with 140 verified SHA-256 entries.
  A real PostgreSQL run covered empty-database baseline installation, legacy
  adoption, idempotent re-entry, and rollback on a mismatched catalog.
- The E2E migration exposed a timezone mismatch when a JavaScript `Date` cutoff
  was compared with a PostgreSQL `timestamp without time zone`. Authorization
  now derives the same absolute cutoff from the database clock; the exact Loot
  PATCH regression test changed from deterministic 403 to green without
  weakening the ten-minute submission window.
- Effect HttpApi handlers are implemented and contract-tested for all 26 API
  groups and all 199 generated operations. One central Layer composes each
  group exactly once, while completeness tests mechanically reject missing,
  duplicate, or unexpected handlers. In total, 89 focused handler tests pass.
  This includes all 49 Events, 11 Members, 27 Notifications, 10 Timers, and 9
  Party Ready Room operations, fail-closed
  authentication, capability checks, visibility, cross-Organization cases, the
  public PNG response's binary body and cache headers, and the existing JSON body
  returned by timer-settings migration.
- The Effect security middleware preserves the deployed Traefik `forwardAuth`
  boundary: Auth validates the JWT/session, while API requires the complete
  request-scoped `x-auth-user-id` and `x-auth-discord-id` pair. A bearer value
  alone is insufficient, incomplete identity fails closed with 401, concurrent
  requests cannot share identity, and the OpenAPI contract still marks exactly
  194 operations as protected while leaving the same 5 operations public.
- Activity's legacy migration chain and Drizzle baseline match mechanically on
  a real TimescaleDB, including column order, types, defaults, constraints,
  indexes, one-day chunks, and seven-day retention. Positive and negative
  adoption checks behave fail-closed.
- Auth, Activity, Battlelog, Gateway, Search, Discord Bot, and Developer
  container targets build as non-root Bun images with `dumb-init`, source maps,
  and healthchecks.
  Runtime entrypoints were inspected, and current Trivy scans reported zero
  fixed high or critical vulnerabilities for the verified images.
- Wrangler dry-runs pass for Wiki and Traffic Splitter without publishing or
  mutating Cloudflare resources.
- React Doctor's changed-source scan reports no errors and 10 warnings (score
  63); every reported location is also present in the baseline full scan, whose
  score is 46. The rewrite therefore introduces no new React Doctor category at
  the reported locations.
- The obsolete Types, Access Policy, Loot Visibility, Reservations, and Scoring
  packages plus API Helpers have no active consumers and were removed after
  their contracts moved to Schema or Domain.

## Preserved risks

- Activity keeps the existing weak deduplication behavior.
- Battlelog keeps the existing database-to-R2 failure window.
- Discord delivery can still repeat after redelivery.
- Existing production databases are adopted only after a known fingerprint;
  schema drift intentionally blocks startup/migration.

## Evidence still required before completion

The rewrite is not complete until the API query layer and host no longer depend
on Nest/Prisma, remaining legacy helper packages are removed, all image targets
and Cloudflare dry-runs pass, and the remaining integration, shutdown,
vulnerability, and performance matrices described in [`status.md`](status.md)
are recorded.
