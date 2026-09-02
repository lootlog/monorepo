# Rewrite verification report

Last updated: 2026-09-02  
Baseline: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`  
Rewrite branch: `feature/bun-effect-rewrite`

## Verdict

The rewrite is not complete. Bun owns the public backend listeners, Prisma and
Socket.IO are absent from active runtime code, the generated HTTP client uses
Orval `single` mode, and four API data paths now run on native Effect layers.
The API still starts a scoped Nest application context for its remaining
services, RabbitMQ subscribers, BullMQ processors, and scheduled jobs. This is
a release blocker for the stated Nest removal criterion.

Do not deploy or cut over realtime from this branch until every release blocker
in this report is closed and the final gates pass from a clean checkout.

## Verified evidence

### HTTP and generated clients

- `bun run client:check` passes.
- The normalized OpenAPI comparison contains all 243 baseline operations and
  the allowlisted realtime ticket endpoint.
- Orval generates one file per OpenAPI input: Activity, Auth, Battlelog, API,
  and Search. It no longer generates per-operation file trees.
- API runtime routing is Effect `HttpApi` on Bun. Events and Notifications no
  longer use Fastify `app.inject()` loopback requests.
- API trusts the complete `x-auth-user-id` and `x-auth-discord-id` pair only.
  Traefik `forwardAuth` sends credentials to Auth, and Auth validates the
  session or JWT before returning those headers. A bearer token sent directly
  to API without the trusted header pair is rejected.

### API test gate

The previous API test command ran only `src/**/*.spec.ts`. It silently skipped
32 `bun:test` files under `src/http-api`. The package gate now runs both suites:

1. `test:legacy`: 112 Vitest files, 1,060 tests.
2. `test:effect`: 32 Bun test files, 131 tests.

`bun run test --filter=@lootlog/api` passes all 1,191 tests. The Bun command
ignores `dist` so compiled copies cannot run twice or read source fixtures from
the wrong directory.

### Database and runtime cleanup

- Active application and package code contains no Prisma client import.
- `MapTemplatesData` and `LootlogConfigData` use
  `drizzle-orm/effect-postgres` through the scoped `ApiDatabaseLive` layer.
- The health handler is Effect-native and has no service lookup.
- Active application and package code contains no Socket.IO runtime import.
- Active application, package, tool, and CI code contains no pnpm command or
  workspace reference.
- The repository-wide migration-marker audit returns no match outside vendored repositories.

### Messaging and realtime lifecycle

- `RabbitMessaging.consume` owns delivery fibers in a scoped `FiberSet`.
  Consumer cancellation interrupts deliveries even when broker cancellation
  fails.
- Gateway owns websocket callbacks, presence sweeps, registry updates, and
  permission rebalance tasks in one scoped `FiberSet`.
- Gateway tests cover MessagePack decoding, origin and ticket authentication,
  bounded backpressure, reconnect state, permission rebalance, presence expiry,
  map pings, air tags, and RabbitMQ topology.

## Release blockers

### API still depends on Nest at runtime

Current source audit:

- 410 API source files import Nest, `nestjs-zod`, the Nest RabbitMQ adapter, or
  `@lootlog/nest-shared`.
- 133 providers still use `@Injectable`.
- 33 controllers remain for legacy OpenAPI generation and compatibility code.

`LegacyNestApplicationLive` starts `NestFactory.createApplicationContext()`.
It does not listen on a socket and Effect closes it with the application scope,
but it remains the owner of most API services and background consumers.

Close this blocker by replacing every `app.get()` entry in
`apps/api/src/http-api/runtime/legacy-data-layers.ts` with native layers,
moving RabbitMQ, BullMQ, and scheduled jobs to scoped Effect resources, and
removing `LegacyNestApplicationLive`, Nest packages, and
`@lootlog/nest-shared` from API runtime code.

### Native API database paths need container acceptance tests

Unit tests cover authorization, decoding, and delegation for Map Templates and
Lootlog Config. Their new native database implementations still need
create/read/update/delete acceptance tests against the real PostgreSQL
container. The tests must also prove Organization scoping and not-found
behavior.

### Remaining final gates

The following evidence must be rerun after the API Nest removal:

- clean `bun install --frozen-lockfile`;
- repository `lint`, `typecheck`, `test`, and `build`;
- deterministic two-pass OpenAPI and Orval generation with clean Git status;
- database adoption and DDL parity against real PostgreSQL and TimescaleDB;
- RabbitMQ redelivery, retry, and DLQ tests against a real broker;
- two-instance Gateway federation against real Redis;
- bounded SIGTERM for every image;
- all Docker image builds, non-root checks, health checks, and Trivy scans;
- 3,000 websocket smoke, 1,000 request/second HTTP burst, and short soak.

## Preserved parity risks

These risks existed before the rewrite and are not redesigned in this branch:

- Activity deduplication remains weak.
- Battlelog retains the database-to-R2 failure window.
- Discord notifications can be delivered more than once.
- Realtime v1 is intentionally incompatible with Socket.IO and requires a
  coordinated Gateway, Web, and Game Client rollout.

## Audit commands

Run these from the repository root:

```sh
bun run client:check
bun run test --filter=@lootlog/api
rg -n '@nestjs|@golevelup/nestjs|nestjs-zod|@lootlog/nest-shared' apps/api/src
rg -n '@prisma/client|PrismaClient' apps packages
rg -n 'socket\.io|socket.io-client' apps packages
rg -n 'MIGRATION[_]TODO' . --glob '!repos/**'
git status --short
```
