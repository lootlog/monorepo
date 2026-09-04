# Security policy

Security rules in this document apply to every Lootlog service and product
surface. Read `PRODUCT.md`, `CONTEXT.md`, and `ARCHITECTURE.md` for the domain and
system boundaries these rules protect.

## Supported versions

Security fixes target the current production release and the next release from
`main`. Older self-hosted revisions are not maintained as supported security
branches unless a published advisory says otherwise.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/lootlog/monorepo/security/advisories/new)
as the preferred channel. If GitHub reporting is unavailable, email
`kamilwronka7@gmail.com`.

Do not open a public issue, post exploit details on Discord, or test against
data or accounts you do not control.

Include:

- the affected URL, service, workspace, version, or commit;
- reproduction steps and required configuration;
- observed and expected behavior;
- the security impact and affected data boundary;
- a minimal proof of concept when safe to provide;
- whether the issue is already public or under active exploitation.

Reports are handled privately while the issue is reproduced, scoped, fixed,
and prepared for coordinated disclosure. Response and remediation times are
best effort and depend on impact and maintainer availability. Credit is given
with the reporter's consent.

## Organization isolation

One persisted `Guild` represents the Discord guild that anchors one Lootlog
Organization. The Organization is the top-level tenant boundary.

Apply Organization scope to:

- record, aggregate, history, comment, and search queries;
- cache, idempotency, object-storage, and job keys;
- RabbitMQ events and consumers;
- Socket.IO subscriptions, rooms, fetches, and per-event delivery;
- notification matching, previews, histories, and external destinations;
- exports, public links, telemetry, and audit records.

Do not assume that possession of a record identifier proves access. Resolve
membership, visibility, and the requested action for every path, including
derived data.

## Identity and authorization

- Discord is the only supported sign-in provider.
- Keep the internal Lootlog user identifier separate from `discordId` in new
  domain contracts.
- Verify sessions, JWTs, and JWKS according to the auth service contract.
- Treat provider tokens, session cookies, bearer tokens, API credentials, and
  recovery material as secrets.
- Discord supplies Organization membership and role membership. Lootlog Access
  policies map from current Discord roles.
- Do not add persistent per-user permission overrides.
- During a Discord outage, stale authorization must be visible and bounded.
  High-risk administration requires fresh verification.

`OWNER` is the recovery authority. Administrative capability does not
automatically grant visibility into every strategic record. A mutation on an
existing resource requires source visibility plus the action permission.

The same visibility decision must cover lists, details, aggregates, search,
history, comments, socket delivery, and notifications. A count, title, NPC name,
or existence check can leak protected data even when the base record is hidden.

## Presence and real-time features

- Authenticate and authorize a socket before joining rooms.
- Rebalance rooms after membership or access-policy changes.
- Validate every inbound payload and rate-limit abusive event sources.
- Separate basic online state from precise location access.
- Publish Presence only to explicitly selected Organizations using a safe
  default.
- Treat a Margonem-signed proof as a trust signal, not a required availability
  dependency. Distinguish verified and authenticated self-reported Presence.
- Use bounded freshness semantics. Stale Presence must expire and must not be
  presented as current.
- Event access does not grant Presence or location access.

Room membership is defense in depth, not the only authorization check. Preserve
per-event checks when a room can contain users with different resource scopes.

## Game-client boundary

The Game client observes Margonem without playing for the user. Preserve inbound
and outbound data, arguments, references, callbacks, `this`, exceptions, return
values, and request counts at the runtime boundary.

Keep Margonem globals behind the approved bridge and adapters. Isolate
observers so one failure cannot affect another observer or the game. Do not add
movement, combat, target-selection, or decision automation.

Lootlog is an unofficial community project. Do not claim official Garmory
approval or guaranteed safety from sanctions.

## Data handling

- Collect the minimum data required for the documented product purpose.
- Do not use chat content, private battles, or precise location for product
  analytics.
- Pseudonymize product and performance telemetry where practical and limit its
  retention.
- Keep personal data, Organization records, public records, and operational
  telemetry in explicit categories.
- Deletion and export must preserve applicable Organization history without
  falsely claiming that shared records are still personal private data.
- Archive and retention jobs must preserve tenant scope and record irreversible
  deletion.
- Public battle links and public API data require explicit public visibility.

Secrets belong in environment or secret-management systems. Never commit `.env`
files, provider tokens, webhook URLs, private vulnerability reports, testimonial
consents, or raw product evidence containing personal data.

## API and input security

- Validate untrusted input at every external boundary.
- Use parameterized queries and ORM query builders; never concatenate untrusted
  SQL.
- Apply pagination, time bounds, and rate limits to public and bulk endpoints.
- Return safe error details in production and keep sensitive context in
  protected logs.
- Restrict CORS and trusted origins to the intended clients.
- Use security headers and an explicit content security policy on web surfaces.
- Sanitize user-generated content before rendering it.
- Validate generated API clients against their OpenAPI sources.

Future public API credentials require explicit scopes, rotation, revocation,
last-used metadata, audit history, and per-key and per-Organization limits. A
credential cannot exceed the data access of its owner or service account.

## Service and event security

Each service writes only its owned data. Cross-service calls use authenticated
APIs or versioned events. Internal endpoints require an explicit network and
authentication boundary; an `/internal` path alone is not protection.

Consumers tolerate redelivery without duplicating durable effects. Do not put
secrets or unnecessary personal data in queue payloads, logs, cache keys, or
metrics labels.

## Dependencies and verification

- Use Oxlint, Oxfmt, TypeScript, Vitest, contract tests, and relevant end-to-end
  tests.
- Run characterization tests and replay benchmarks for game-runtime changes.
- Add authorization tests for allowed and denied Organization, policy, and
  resource-scope cases.
- Test reconnect, stale-state, permission-rebalance, replay, and duplicate-event
  paths for real-time changes.
- Do not bypass hooks or reduce security expectations to make CI pass.

Use `bun audit` as one signal, not proof that the application is secure.

## Disclosure

Fix validated issues privately. Publish an advisory after a patch or effective
mitigation is available, and coordinate timing with the reporter when possible.
Notify affected users through the appropriate product or community channel when
the impact requires action.
