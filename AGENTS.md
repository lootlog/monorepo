# AI agent instructions

These instructions apply to every workspace unless a closer `AGENTS.md`
overrides a rule for its subtree.

## Authority and required context

Apply instructions in this order:

1. the closest `AGENTS.md` to the file being changed;
2. parent `AGENTS.md` files up to this root;
3. canonical repository documents linked below;
4. repository skills in `.agents/skills`;
5. generic or external skills;
6. lint, tests, and CI as mechanical enforcement.

A local instruction may strengthen or replace a root rule only when it states
the exception explicitly.

Read the documents relevant to the change:

- [`PRODUCT.md`](PRODUCT.md) — target product, priorities, and non-goals.
- [`CONTEXT.md`](CONTEXT.md) — canonical domain terms.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — current system, target contracts, and known gaps.
- [`docs/adr/README.md`](docs/adr/README.md) — accepted architecture decisions and their lifecycle.
- [`SECURITY.md`](SECURITY.md) — mandatory for auth, authorization, API, gateway,
  user content, data, public endpoints, and external integrations.
- [`DESIGN.md`](DESIGN.md) — canonical visual system for public and product surfaces.
- [`apps/web/design-guideline.md`](apps/web/design-guideline.md) — web app UI contract.

`PRODUCT.md` and target sections in `ARCHITECTURE.md` are design constraints,
not proof that a feature already exists. Do not describe target behavior as
implemented until code and verification agree.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the
repo root), use it before grep/find or reading source files when you need to
understand or locate code:

- MCP: use `codegraph_explore` for symbols, source, and call paths, or
  `codegraph_node` for one symbol or source file.
- Shell: use `codegraph explore "<question>"` or `codegraph node <symbol-or-file>`.

If `.codegraph/` does not exist, skip CodeGraph. Indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Code style

- Use descriptive names and self-explanatory structure.
- Use `===`, `??`, and optional chaining where their semantics fit.
- Prefix intentionally unused variables with `_`.
- Avoid chained ternaries; use branches or early returns.
- Keep imports from one module in one statement and use inline `type` specifiers.
- Use `import type` when a symbol exists only at type level.
- Follow `.oxlintrc.md` and the effective Oxlint configuration.

## React and frontend

- React Compiler handles memoization. Do not add `memo`, `useMemo`, or
  `useCallback` unless a measured integration constraint requires an explicit
  exception.
- Keep one component per file.
- Put all user-facing static text behind i18n. Polish is the only supported
  product language, but hardcoded copy is still forbidden.
- `apps/web` is client-rendered, not SSR.
- Apply the Persuade, Operate, or Read mode from `DESIGN.md` instead of copying
  landing-page composition across apps.
- Meet WCAG 2.2 AA for web surfaces. Preserve keyboard use, visible focus,
  reduced motion, semantic naming, and responsive core workflows.

## Domain and security

- In code, `Guild` means the Discord guild that anchors one Lootlog
  Organization. Do not use it for a Margonem clan.
- Preserve the Organization boundary in queries, aggregates, cache keys, jobs,
  events, socket rooms, search projections, comments, history, and notifications.
- A mutation on an existing resource requires both resource visibility and the
  action permission.
- Derived views must not reveal metadata hidden by the source access policy.
- Discord is the only supported sign-in provider. Domain data should reference
  the internal user identifier rather than spreading `discordId` into new
  contracts.
- Never publish secrets, credentials, private reports, or private product
  evidence.

## Protected contracts

Do not assume backward compatibility for internal, unreleased code. Preserve
these contracts unless the change includes an explicit migration or coordinated
rollout:

- Margonem runtime behavior and object/callback semantics;
- deployed HTTP, RabbitMQ, and websocket contracts;
- persisted data and migrations;
- userscript settings and stored preferences;
- public battle links.

Internal TypeScript interfaces, UI components, and explicitly experimental
features do not receive compatibility by default.

## Architecture

- Each data domain has one writer. Do not read or mutate another service's
  database directly.
- Exchange versioned APIs or facts between independently deployed services.
- Keep consumers idempotent where delivery can repeat.
- Treat caches and search indexes as rebuildable projections.
- Do not add a deployable service without documenting its independent scaling,
  failure, data, security, or release boundary.
- Prefer bounded work in the game client. Performance regressions are release
  blockers, not follow-up polish.

## Verification

- Every workspace should declare `lint`, `typecheck`, and `test`, or document why
  a gate does not apply.
- Run the narrowest relevant checks during development and all required
  workspace checks before handoff.
- Add contract or end-to-end coverage when a change crosses the game client,
  HTTP API, queue, gateway, or generated client boundary.
- Follow the closer game-client instructions for characterization tests and
  replay benchmarks.
- Do not update golden expectations merely to make a behavior change pass.

Do not try to start the application; assume it is already running.

## Git, pull requests, and releases

- Follow Conventional Commits and `commitlint.config.js`.
- Write pull request titles, descriptions, Changesets, ADRs, and technical
  documentation in English.
- Never bypass hooks with `--no-verify`.
- Add a Changeset when runtime behavior, user-facing behavior, a public contract,
  build output, or dependencies change.
- Tests, non-published documentation, and non-release configuration do not need
  an empty Changeset.
- Published docs and landing content change build output and require a normal
  Changeset.
- Never edit package versions or generated changelogs manually, and never run
  `bun run version` outside release automation.
- Production promotions and rollbacks reuse immutable artifacts. Never rebuild
  an existing release version.

## Documentation

- Update the canonical source first, then app-specific deltas and public guides.
- Keep `CONTEXT.md` free of implementation detail.
- Create ADRs only for decisions that are hard to reverse, surprising without
  context, and based on a real trade-off.
- Claims require an approved entry in `docs/product-evidence.md`.
- Do not publish testimonials.
- Do not create source files that only re-export symbols; update imports to the
  real module.
