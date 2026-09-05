# Lootlog

Lootlog is an open-source Margonem companion that connects an in-game client,
a shared web workspace, and Discord. It turns supported gameplay events into
current, durable information for players and organized groups without requiring
them to copy timers, loot records, or coordination state by hand.

The primary daily user is an active member of an organized Margonem group. A
leader, deputy, or tactician usually makes the adoption decision, but every
member must receive useful in-game feedback rather than acting only as a data
source.

## What Lootlog must protect

### 1. Trust the signal

Accepted durable records must not disappear silently, and retries must not
create unintended duplicates. Show degraded or stale state instead of
presenting it as current truth.

### 2. Keep Margonem fast

Normal play must not feel slower with Lootlog enabled. Keep game-client work
bounded; a client performance regression is a release blocker.

### 3. Isolate Organizations

The Organization is the top-level security boundary. Apply its access policy to
base records, derived views, delivery paths, and metadata.

### 4. Complete the connected workflow

A change is incomplete when it works on one relevant surface but fails on
another. Account for the Game client, Web app, Discord bot, public surfaces,
installation methods, deployed contracts, and generated clients as applicable.

Resolve architectural trade-offs in this order:

1. Do not interfere with Margonem or lose accepted durable data.
2. Preserve Game client performance.
3. Preserve security and Organization isolation.
4. Preserve real-time reliability.
5. Control infrastructure cost.
6. Preserve development speed and maintainability.
7. Preserve abstract future flexibility.

## Project principles

Prefer ambitious outcomes and simple systems. Understand the real constraint,
then implement the smallest complete model that makes correct behavior
unsurprising. Remove accidental complexity instead of preserving it, and avoid
machinery justified only by a possible future need.

Measure before adding performance work. Fix a defect at the shared root cause
after tracing every caller and affected boundary. Treat current code and
verification as evidence; roadmap documents and target architecture are not
proof that a feature already exists.

## GPT-6 Astra operating defaults

These defaults tune GPT-6 Astra and define the same work contract for other
capable agents:

- Infer the user's intent and authorized scope from their request and the prior
  conversation. Treat requests such as “help me,” “can you,” and “I want to” as
  instructions to do the work, not invitations to describe how it could be done.
- Persist until the authorized outcome is complete. Do not stop at a plan,
  partial fix, or capability statement when the requested work can be completed.
- Inspect the repository before asking questions. Ask only when missing input
  would materially change the result, new authority is required, or the next
  action would be destructive or irreversible.
- Complete reversible preparation before requesting approval for a consequential
  final action. Present a concrete, reviewable result rather than a hypothetical
  proposal.
- Explicit user instructions override repository defaults and skill guidelines.
  System and platform policy, authorization boundaries, and the user's ownership
  of data remain controlling. If the user explicitly changes a product,
  security, or compatibility contract, include its migration, documentation,
  and verification consequences in the work.
- Delegate independent, bounded work when parallel execution will materially
  improve speed or quality. The primary agent owns integration, conflict
  resolution, and final verification.
- Lead with the outcome. Use plain, direct language and concise paragraphs. Use
  lists only for parallel, sequential, or comparative information.
- If a skill causes the work to pause, remain unfinished, or change direction,
  name the exact `SKILL.md`, identify the controlling instruction, and explain
  briefly how it applies.

## Working in this repository

This is the repository's only `AGENTS.md` and applies to every workspace. Apply
repository material in this order after the operating defaults above:

1. this file;
2. repository skills in `.agents/skills`;
3. generic or external skills;
4. lint, tests, and CI as mechanical enforcement.

Preserve unrelated user changes in the working tree. Assume the application is
already running; do not start it. Keep temporary plans, research, and agent
scratch files outside tracked repository paths.

<!-- CODEGRAPH_START -->

### CodeGraph

This repository is indexed by CodeGraph through `.codegraph/`. Use it before
grep, find, or broad source reads when locating code or tracing behavior:

- MCP: use `codegraph_explore` for symbols, source, and call paths, or
  `codegraph_node` for one symbol or file.
- Shell: use `codegraph explore "<question>"` or
  `codegraph node <symbol-or-file>`.

<!-- CODEGRAPH_END -->

## Vendored repositories

When work depends on a library vendored under `repos/`, inspect that repository
before using web search or guessing from documentation. Use its implementation,
tests, and module structure as reference material.

- Treat `repos/` as read-only unless the user explicitly asks to update a
  vendored repository.
- Keep application imports pointed at installed package dependencies; never
  import or ship code from `repos/`.
- Before writing Effect code, read `repos/effect/LLMS.md`, then inspect
  `repos/effect/` for the relevant idiomatic patterns.

## How it works

The main flow is:

```text
Margonem runtime
  -> Game client observers and processors
  -> HTTP APIs and the realtime v1 WebSocket gateway
  -> PostgreSQL / TimescaleDB / R2
  -> RabbitMQ domain and delivery events
  -> gateway, activity, search, Discord, and Web consumers
```

The main code areas are:

- `apps/game-client` and `apps/web` provide the primary product surfaces.
  `apps/landing`, `apps/docs`, and `apps/wiki` provide public surfaces;
  `apps/developer` is not yet a supported product.
- `apps/api`, `apps/auth`, `apps/gateway`, `apps/battlelog`, `apps/activity`,
  `apps/search`, and `apps/discord-bot` own independently deployed backend
  responsibilities.
- `apps/traffic-splitter` owns shared edge routing for `dev.lootlog.pl` and
  `lootlog.pl`.
- `packages/` contains generated clients, browser-safe contracts and domain
  logic, protocols, UI, configuration, and tools. Defining a shared type does
  not make a package the owner of its data.
- `repos/` contains vendored reference repositories for external dependencies.

## Domain language and boundaries

Use these terms consistently:

- **Organization** is the top-level Lootlog group, anchored to exactly one
  Discord server and representing one player faction.
- **Discord guild** is the Discord entity that anchors an Organization. In
  code, `Guild` means this concept.
- **Margonem clan** is an in-game clan. One Organization may include several
  clans and players without a clan; never use `Guild` for a Margonem clan.
- **User** is a person with a Lootlog account, **Member** is a User whose current
  Discord membership places them in an Organization, and **Player** is a
  Margonem character.

Preserve these boundaries:

- Scope queries, aggregates, cache and idempotency keys, jobs, events, socket
  rooms, search projections, comments, history, notifications, exports, and
  telemetry to the Organization where applicable.
- A mutation on an existing resource requires both source visibility and the
  relevant Capability. Derived views must not reveal metadata hidden by the
  source policy.
- Each data domain has one writer. Exchange authenticated, versioned APIs or
  facts between services instead of reading or mutating another service's
  database.
- Keep redelivered consumers idempotent. Treat caches and search indexes as
  rebuildable projections.
- Discord is the only supported sign-in provider. New domain contracts refer to
  the internal User identifier instead of spreading `discordId`.
- Keep secrets, credentials, private reports, and private product evidence out
  of code, logs, events, commits, and public output.

Preserve these compatibility contracts unless the change includes an explicit
migration or coordinated rollout:

- Margonem runtime behavior and object, callback, `this`, exception, return
  value, and request-count semantics;
- deployed HTTP, RabbitMQ, and WebSocket contracts;
- persisted data and migrations;
- userscript settings and stored preferences;
- public battle links.

Internal TypeScript interfaces, UI components, and explicitly experimental
features do not receive backward compatibility by default.

## Check every affected boundary

Before calling a change complete, account for every applicable item:

- **Entry points and surfaces:** Game client, Web app, responsive mobile Web,
  Discord bot, public surfaces, and every affected Game client installation
  method.
- **Contracts:** HTTP schemas, RabbitMQ facts, WebSocket events, generated
  clients, persistence, and rollout order.
- **Access:** lists, details, aggregates, search, history, comments, socket
  delivery, notifications, and metadata use the same source policy.
- **Reverse states:** when a state can be entered, provide the applicable way to
  inspect and leave it.
- **Documentation:** update user guides when shipped behavior changes.

## Implementation rules

- React Compiler owns memoization. Add `memo`, `useMemo`, or `useCallback` only
  for a measured integration constraint.
- Keep one React component per file. Put all user-facing static text behind
  i18n; Polish remains the only supported product language.
- Treat `apps/web` as client-rendered and meet WCAG 2.2 AA, including keyboard
  use, visible focus, reduced motion, semantic names, and responsive core
  workflows.
- Keep Margonem globals behind the approved bridge and adapters. Isolate
  observers so one failure cannot affect the game or another observer.
- Add a deployable service only when its scaling, failure, data, security, or
  release boundary justifies independent deployment.
- Import from the module that owns a symbol. Do not create source files that
  only re-export symbols.

### Prevent duplicated logic

- Before adding or copying logic, search by behavior as well as symbol name
  across the relevant apps and packages. Reuse the existing owner, standard
  library, or installed dependency before writing another implementation.
- When equivalent logic has multiple callers, keep one implementation in the
  narrowest suitable owning module. Migrate every equivalent occurrence in
  the affected family, including inline copies and differently named helpers;
  extracting a helper while leaving its copies behind is incomplete.
- Compare input acceptance, defaults, side effects, errors, and boundary
  contracts before consolidating. Keep meaningful differences explicit;
  similar syntax alone does not justify a configurable abstraction.
- Before finishing, search the affected family again. Remove remaining
  equivalent copies and explain any intentionally retained variants in the
  delivery notes. Passing tests alone does not prove deduplication is complete.

## Verification

- Start with the smallest proof that exercises the changed behavior. Run lint,
  typecheck, and tests for every affected workspace; broaden or repeat checks
  only when cross-workspace contracts, risk, failures, or unresolved concerns
  justify it.
- After changing backend HTTP contracts (including response statuses), run
  `bun run client:generate` from the repository root, review and commit all
  affected OpenAPI specifications and generated clients, and update callers
  and contract checks for the intended behavior. Run `bun run client:check`
  before pushing; successful generation alone is not verification. Update
  parity exceptions only for independently verified, intentional changes.
- Tests must protect observable behavior, business invariants, real
  regressions, authorization boundaries, or meaningful integration contracts.
  Each test must answer: “What real regression would this catch?”
- Skip tests that count symbols or modules, mirror private wiring, restate the
  type system, verify framework mechanics, or exist only to increase coverage.
  Broad snapshots are not a substitute for behavioral assertions.
- Keep E2E fakes at genuine external boundaries. Verify resulting state, not
  only status codes, and never mock the unit under test or internal application
  layers.
- Add contract or end-to-end coverage when a change crosses Game client, HTTP,
  RabbitMQ, gateway, or generated-client boundaries. Game client runtime,
  adapter, processor, projection, and domain-store changes require relevant
  characterization tests.
- Preserve golden expectations until an intended behavior change has been
  established independently. Documentation-only changes do not require
  application tests.

## Delivery

- A completed change may include a local Conventional Commit. Push a branch or
  open a pull request only when the user explicitly asks.
- Follow `commitlint.config.js`, preserve hooks, and never use `--no-verify`.
  Do not mention Codex in commits or add `[codex]` to a pull request title.
- Write code, API contracts, architecture documents, ADRs, agent instructions,
  pull request titles, and pull request descriptions in English. Write product
  and user documentation in Polish.
- Do not publish testimonials or unaudited product claims.
- Pull requests carry no release metadata. Production promotions and rollbacks
  reuse immutable image references and Cloudflare deployments; never rebuild a
  revision during rollback.
