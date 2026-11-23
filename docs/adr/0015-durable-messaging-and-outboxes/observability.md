# Observability and resilience details

Part of [0015-durable-messaging-and-outboxes](../0015-durable-messaging-and-outboxes.md).

## Observability and resilience

- **`runService`** (`packages/instrumentation/src/service.ts`): `supervise` ends the process when a runtime dependency such as the RabbitMQ connection fails after start, leaving recovery to the orchestrator.
- **`RabbitMessaging.process`** (`packages/messaging/src/messaging.ts`): process spans are roots, because otherwise every delivery would join one process-lifetime consume trace.
- **Span attribute hook** (`packages/instrumentation/src/observability.ts`): drops `url.full`, `url.query` and request header attributes because credentials can live in arbitrary headers and OAuth query strings. The fiber context hook re-enters `logSpanContext` only when the stored span differs from the fiber's, because promise continuations already inherit it.
- **`httpServerMetrics`** (`packages/instrumentation/src/instrumentation.ts`): logs only failures and requests slower than 1 s, since fast successes are in metrics and traces. `httpServerRouteMetrics` captures the route template before HttpEffect restores the request context. `withHttpServerErrorLevel` (`packages/instrumentation/src/logging.ts`) raises 5xx logs to Error so they reach alerts.
- **`boundedHttpGet`** (`packages/instrumentation/src/bounded-http-get.ts`): retries with full-jitter exponential backoff capped at 2 s, so callers that failed together do not repeat the burst.
- **`isRetryableApiFailure`** (`packages/client/src/transport.ts`): never retries 401, 403 or 404, which the server will repeat; on the Game client an expired session would otherwise keep re-asking the API.
- **`makePostgresLayer`** (`packages/database/src/postgres.ts`): sets a 30 s TCP keepAlive so dead connections fail instead of hanging, and a 10 s `acquireTimeout` so an exhausted pool fails visibly.
- **`reconnectingBunRedisLayer`** (`packages/database/src/bun-redis.ts`): reconnects from Bun's `onclose`, because Bun's RedisClient stops reconnecting for good after a `connectionTimeout` (a Dragonfly restart once left battlelog rejecting every battle). On shutdown `onclose` becomes a no-op because Bun needs a callable handler during `close()`.
- **`getOrFillJson`** (`packages/database/src/redis-cache-fill.ts`): lets one caller per Redis lease fill a value while others wait, publishes only while it still owns the lease, and falls back to the factory uncached only on Redis failures; a factory failure fails the read.
- **BullMQ `prefix`** and **`useBunRedis`** (`packages/database/src/bullmq.ts`): all queues use `{bull}` so they share one Redis Cluster hash slot, and the Bun Redis factory is set before every connection instead of through an import side effect.
- **`runDrizzleMigrations`** and **`migrationClient`** (`packages/database/src/migration.ts`): migrations hold a session advisory lock from a `lockKey` that must stay stable across releases, so concurrent deploys apply each migration once, and use a dedicated `pg` client for the simple-query protocol. The auth runner (`apps/auth/src/database/migrations.ts`) compares legacy journal timestamps at second precision and holds a transaction-scoped lock because Drizzle shares the transaction.
- **Activity health probe** (`apps/activity/src/http/activity-http.ts`): runs under a single-permit semaphore held until the interrupted query's cleanup finishes, because PostgreSQL cancellation can outlast the 3 s deadline and probes would pile up.

## Consequences

- Every new durable side effect needs an outbox row written in the committing transaction and a dispatcher that tolerates repeats; publishing directly after commit is acceptable only for best-effort hints.
- Every consumer must be idempotent and must choose its failure route deliberately: latest-state facts without a sequence cannot use a delayed retry queue.
- Optional fields in deployed event contracts stay optional until no deployed publisher omits them, and each needs a defined fallback.
- Search indexes and caches may lag or run ahead briefly; they are rebuildable, and the catalog rebuild script is the recovery path.
- Outbox tables, delivery leases and in-place retries cost database round trips; batching dispatch is a measured optimization, not a default.
