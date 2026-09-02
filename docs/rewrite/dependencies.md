# Dependency baseline and target

## Package manager state

The archived baseline used pnpm `12.1.0`, catalog versions, overrides, package
extensions, and an `allowBuilds` list. The Bun workspace now records the active
dependency graph in `bun.lock` and the root catalog.

Keep `trustedDependencies` limited to reviewed native packages such as Tailwind
Oxide, esbuild, msgpackr extract, protobufjs, rolldown, sharp, resolver binaries,
and workerd. Do not trust all transitive packages.

## Current runtime families

| Concern              | Current implementation                                                         |
| -------------------- | ------------------------------------------------------------------------------ |
| HTTP and composition | Effect HttpApi, scoped Layers, Effect Config, and Bun servers                  |
| RabbitMQ             | `@lootlog/messaging` with explicit topology in `@lootlog/protocol`             |
| Background jobs      | BullMQ in API and Battlelog                                                    |
| Relational databases | Drizzle ORM with fail-closed adoption of archived migration history            |
| Realtime             | Native WebSockets with Redis federation                                        |
| Discord              | `discord.js` behind the Discord Bot application Layer                          |
| Tests                | `bun:test`, with Vitest only in browser/Vite workspaces                        |
| Frontend             | React 19.2, Vite 8.2, TanStack Query/Router, Cloudflare Workers where declared |
| HTTP contracts       | Five committed OpenAPI documents, generated clients, and local HttpApi schemas |

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
3. Framework packages: remove obsolete adapters, keep transport-neutral helpers,
   and compose runtime infrastructure with Effect Layers.

Do not delete an old package until `rg` finds no consumer and browser-safety bundling passes for schema, domain, protocol, and client.

## Migration hazards

- The pnpm catalog currently normalizes versions that individual manifests express as `catalog:`. Resolve every catalog reference into Bun-compatible workspace metadata before deleting `pnpm-workspace.yaml`.
- Preserve package extensions and security overrides until the dependency they patch is removed.
- Better Auth owns exact persisted column names and raw handler behavior; upgrading Drizzle must not regenerate incompatible DDL.
- Drizzle release-candidate SQL and Effect APIs are pinned prereleases. Do not float ranges.
- Cloudflare applications remain on their Workers runtime; Bun changes install/build orchestration, not the production runtime.
- Generated Orval clients remain fetch/Promise and TanStack Query APIs. Effect stays behind the service boundary.

## Dependency completion evidence

- A frozen Bun install succeeds twice from a clean cache and produces no lockfile diff.
- The Bun dependency graph contains no unexpected install-script package.
- No runtime dependency on removed backend frameworks, ORM clients, realtime
  adapters, decorator adapters, or obsolete internal packages remains. Direct
  Zod use is retained where it provides framework-neutral validation or codecs.
- Required Vite/DOM Vitest workspaces are documented; every other test workspace runs through `bun:test`.
- All source-export packages pass TypeScript resolution and browser-safety bundling without `dist`.
