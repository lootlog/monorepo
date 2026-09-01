# Contributing to Lootlog

Lootlog accepts bug fixes, documentation improvements, performance work, and
features that fit the product direction. Read these documents before proposing a
large change:

- [`PRODUCT.md`](PRODUCT.md)
- [`CONTEXT.md`](CONTEXT.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`SECURITY.md`](SECURITY.md)
- the closest `AGENTS.md` to the code you will change

The [Code of Conduct](CODE_OF_CONDUCT.md) applies to every project space.

## Report problems

Search existing issues before opening a new one. A useful bug report includes:

- a specific title;
- reproduction steps;
- observed and expected behavior;
- app and client versions;
- browser, installation method, Margonem interface, and OS when relevant;
- screenshots or recordings that do not expose private Organization data.

Report vulnerabilities privately through the process in
[`SECURITY.md`](SECURITY.md). Do not open a public security issue.

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
- Bun 1.4.0
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

- Follow the closest `AGENTS.md` and effective Oxlint configuration.
- Use Oxfmt rather than hand-formatting generated style changes.
- Add or update tests for behavior changes.
- Update the canonical document before copying facts into a public guide.
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

## Changesets

Add a Changeset when a workspace change affects runtime behavior, user-facing
behavior, a public contract, build output, or dependencies.

- Use `patch` for fixes and compatible improvements.
- Use `minor` for backward-compatible features.
- Use `major` for breaking consumer-facing changes.
- Include every directly affected workspace.
- Write the summary in English.

Tests, non-published documentation, and non-release configuration do not require
an empty Changeset. Published docs and landing content affect build output and
require a normal Changeset.

Never edit package versions or generated changelogs manually.

## Pull requests

- Use an English Conventional Commit title.
- Complete the pull request template.
- Link the issue, RFC, or ADR when one exists.
- List automated checks and manual scenarios.
- Describe data, security, performance, rollout, and rollback risks.
- Include screenshots or recordings for visible UI changes.
- Confirm that you can submit the contribution under the MIT License.
