# Contributing to Lootlog

Lootlog accepts bug fixes, documentation improvements, performance work, and
features that fit the product direction. Read [`AGENTS.md`](AGENTS.md) before
proposing a large change.

The [Code of Conduct](CODE_OF_CONDUCT.md) applies to every project space.

## Report problems

Search existing issues before opening a new one. A useful bug report includes:

- a specific title;
- reproduction steps;
- observed and expected behavior;
- app and client versions;
- browser, installation method, Margonem interface, and OS when relevant;
- screenshots or recordings that do not expose private Organization data.

Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/lootlog/monorepo/security/advisories/new).
Do not open a public security issue.

## Propose changes

A large feature proposal should state:

- the user problem;
- the affected product pillar;
- whether it is core, supporting, experimental, or deprecated;
- expected usage and success measure;
- performance, security, data, infrastructure-cost, and migration impact;
- why an existing feature or external tool does not already solve the problem.

The project owner decides product direction and roadmap. Merging an experiment
does not guarantee permanent public support.

## Local setup

Requirements:

- Node.js 26.8.1
- Bun 1.4.1
- Docker with Docker Compose

```bash
git clone https://github.com/lootlog/monorepo.git
cd monorepo
bun install
bun run env:generate
docker compose up -d
bun run db:api:migrate:dev
bun run db:activity:migrate:dev
bun run db:auth:migrate:dev
bun run db:battlelog:push
bun run dev
```

The app is normally already running in the maintainer environment. Agents must
not start another copy unless asked.

## Make a change

- Follow the root `AGENTS.md` and effective Oxlint configuration.
- Use Oxfmt rather than hand-formatting generated style changes.
- Add or update tests for behavior changes.
- Preserve protected contracts or include an explicit migration.
- Do not bypass hooks with `--no-verify`.

Common checks:

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun run format:check
```

Use the narrowest relevant workspace checks while developing. Run every gate
required by the affected workspace before handoff.

## API architecture and checks

Backend TypeScript schemas and types are maintained by hand in all seven services:
API, Auth, Gateway, Battlelog, Activity, Search, and Discord bot. Effect schemas
define HTTP validation; infer their TypeScript types from those schemas. Reuse
schemas from their owning module instead of copying fields or adding endpoint
aliases. Existing OpenAPI component identifiers remain stable for client compatibility.

Routine backend generation is limited to SQL migrations and OpenAPI YAML. Drizzle migration
snapshots and other migration metadata, immutable migration archives, and compiled
`dist` output are retained. Edit Drizzle schemas manually before generating SQL;
do not use auth tooling to overwrite TypeScript source.

Manual database introspection is also available for API, Auth, Activity, and
Battlelog. Run `bun run db:pull` within the service or `bun run db:api:pull`,
`bun run db:auth:pull`, `bun run db:activity:pull`, or
`bun run db:battlelog:pull` from the repository root. Each command uses the
service's Drizzle configuration and writes introspection artifacts to its configured
`out` directory. PostgreSQL environment overrides are forwarded through Turbo,
so a database copy can be inspected independently of local defaults. Review the
resulting files before using them; introspection does not validate or apply
migrations, and the handwritten source schemas remain authoritative.
Client generation in `packages/client` consumes the exported OpenAPI documents.

In `apps/api/src`, feature modules own business operations and persistence.
`contracts/` contains shared input/output schemas used by those modules and HTTP
adapters. `http-api/` owns route declarations, authentication middleware contracts,
and handlers. Domain code must not import HTTP handlers or runtime composition.

`runtime/features/` assembles each feature's live dependencies;
`runtime/api-data-layers.ts` joins those layers for requests and background work.
`runtime/application/` owns application lifetime, `runtime/background/` owns workers
and consumers, and `runtime/infrastructure/` owns external clients. Shared timer
projections live with their feature in `timers/timer-projection.ts`.
Member refresh job processors live in `members/`; timer and reservation retention
operations live in `timers/` and `reservations/`. Background runtime code only wires
these operations to scoped workers, consumers, and schedules.

Run API checks from `apps/api`:

```bash
bun run typecheck
bun run test
bun run test:integration
bun run test:e2e
bun run lint
bun run build
```

Typecheck includes source and tests. Unit tests run from `src`, including runtime
and contract tests. Integration and HTTP E2E tests start isolated PostgreSQL and
Dragonfly containers and apply the complete migration chain; Docker must be
available. Repository integration tests exercise real database operations, while
service tests replace dependencies at their public interfaces.

## Releases

Pull requests do not carry release metadata. Production releases select an
immutable commit from `main` in GitHub Actions. Do not edit package versions or
generated changelogs as part of a pull request.

## Pull requests

- Use an English Conventional Commit title.
- Complete the pull request template.
- Link the issue, RFC, or ADR when one exists.
- List automated checks and manual scenarios.
- Describe data, security, performance, rollout, and rollback risks.
- Include screenshots or recordings for visible UI changes.
- Confirm that you can submit the contribution under the MIT License.
