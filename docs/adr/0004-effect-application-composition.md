# ADR 0004: Effect application composition

- Status: Accepted
- Date: 2026-09-01

## Context

Backend applications used Nest modules, decorators, global lifecycle hooks, and
several logging and configuration adapters. Resource ownership was distributed
between framework modules, which made shutdown order and test isolation hard to
verify.

The rewrite needs one composition model for HTTP servers, database pools,
Redis, RabbitMQ, observability, configuration, and background work.

## Decision

Build backend applications with Effect 4.0.0-rc.112. Model infrastructure as
scoped Layers, load configuration through Effect Config, and expose expected
failures through typed Effect error channels. Use Effect logging and OpenTelemetry
integration instead of backend Winston adapters.

Run each process through the Bun Effect runtime. SIGINT and SIGTERM must close
the application scope in a bounded order before the process exits. HTTP
framework adapters may expose raw handlers where a library contract requires
one, including Better Auth under `/idp` and `/idp/*`.

## Consequences

- Tests can replace database, queue, cache, clock, and transport Layers without
  constructing a framework container.
- Acquire and release behavior is part of each resource contract.
- Defects and operational failures remain distinct from unchecked runtime
  defects.
- Effect version upgrades require coordinated validation while the repository
  depends on a release candidate.
