# Dependency baseline and target

## Package manager state

The baseline uses pnpm `12.1.0`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, catalog versions, overrides, package extensions, two Nest patches, and an `allowBuilds` list. `injectWorkspacePackages` is false and peer dependencies resolve per workspace. Bun migration must reproduce those choices before pnpm files are removed.

Native/install-script packages explicitly allowed by the baseline include Prisma engines/client, Nest core, Tailwind Oxide, esbuild, msgpackr extract, protobufjs, rolldown, sharp, SSH, resolver binaries, and workerd. Necord is explicitly denied. Convert this into a minimal reviewed Bun `trustedDependencies` list; do not trust all transitive packages.

## Current runtime families

| Concern                   | Baseline                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- |
| Backend framework         | NestJS 12.0.x across API, Activity, Auth, Battlelog, Gateway, Search, Discord Bot |
| Runtime composition       | RxJS 7.8, Zod 4.4, Winston 3.19, `nest-winston`, `nestjs-zod`                     |
| RabbitMQ                  | `@golevelup/nestjs-rabbitmq` 9.0.2                                                |
| Background jobs           | BullMQ 5.81.4 in API and Battlelog                                                |
| API and Activity database | Prisma and client 7.10.0                                                          |
| Auth database             | Drizzle ORM 0.45.2 / Kit 0.31.10                                                  |
| Battlelog database        | Drizzle ORM/Kit `1.0.0-beta.20`                                                   |
| Realtime                  | Socket.IO and client 4.8.3; Redis adapter                                         |
| Discord                   | Necord 6.14.0                                                                     |
| Internal package builds   | `tsdown` 0.22.14 for ten leaf/shared packages                                     |
| Tests                     | Vitest 4.1.11 in most workspaces; Node test in Developer; TSX test in CLI         |
| Frontend                  | React 19.2, Vite 8.2, TanStack Query/Router, Cloudflare Workers where declared    |
| HTTP client generation    | Orval from five committed OpenAPI documents                                       |

## Pinned rewrite target

- Bun `1.4.0` is the package manager and backend runtime.
- `effect`, `@effect/platform-bun`, `@effect/sql-pg`, and `@effect/opentelemetry` are pinned to `4.0.0-rc.112`.
- `drizzle-orm` and `drizzle-kit` are pinned to `1.0.0-rc.4`; PostgreSQL integration uses `drizzle-orm/effect-postgres` with `@effect/sql-pg`.
- Backend and runtime-neutral package tests use `bun:test`. Vitest remains only where Vite, browser DOM, coverage, or benchmark integration requires it.
- Private source-only packages export TypeScript source directly. Keep a build only when the workspace ships an independent artifact.

## Package graph migration

The baseline graph has three kinds of package that must be classified before removal:

1. Contract packages: `@lootlog/types`, `@lootlog/api-client`, and `@lootlog/socket-parser`. Replace them with browser-safe `@lootlog/schema`, pure `@lootlog/domain`, wire-only `@lootlog/protocol`, transport `@lootlog/messaging`, and generated `@lootlog/client`.
2. Domain micro-packages: access policy, loot visibility, reservations, scoring, and datetime. Move cohesive business rules into Domain; keep Margonem and battle processing separate where their runtime boundary is real.
3. Framework packages: `@lootlog/nest-shared`, `@lootlog/api-helpers`, and instrumentation. Replace Nest adapters with Effect Layers and move only transport-neutral code into the new graph.

Do not delete an old package until `rg` finds no consumer and browser-safety bundling passes for schema, domain, protocol, and client.

## Migration hazards

- Turbo can race Prisma generation today. Give code generation one writer before increasing Bun task concurrency.
- The pnpm catalog currently normalizes versions that individual manifests express as `catalog:`. Resolve every catalog reference into Bun-compatible workspace metadata before deleting `pnpm-workspace.yaml`.
- Preserve package extensions and security overrides until the dependency they patch is removed.
- Better Auth owns exact persisted column names and raw handler behavior; upgrading Drizzle must not regenerate incompatible DDL.
- Drizzle release-candidate SQL and Effect APIs are pinned prereleases. Do not float ranges.
- Cloudflare applications remain on their Workers runtime; Bun changes install/build orchestration, not the production runtime.
- Generated Orval clients remain fetch/Promise and TanStack Query APIs. Effect stays behind the service boundary.

## Dependency completion evidence

- A frozen Bun install succeeds twice from a clean cache and produces no lockfile diff.
- The Bun dependency graph contains no unexpected install-script package.
- No runtime dependency on Nest, Prisma, Socket.IO, Necord, backend
  Winston/RxJS, `nestjs-zod` DTO adapters, or obsolete internal packages
  remains. Direct Zod use is retained where it provides framework-neutral
  validation or codecs.
- Required Vite/DOM Vitest workspaces are documented; every other test workspace runs through `bun:test`.
- All source-export packages pass TypeScript resolution and browser-safety bundling without `dist`.
