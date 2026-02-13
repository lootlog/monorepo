# Repository Guidelines

## Project Structure & Module Organization

This repository is a `pnpm` + Turborepo monorepo.

- `apps/`: deployable services and frontends (`api`, `auth`, `gateway`, `battlelog-service`, `activity`, `discord-bot`, `search`, `web`, `game-client`, `landing`).
- `packages/`: shared code (`ui`, `types`, `api-helpers`, `nest-shared`, `instrumentation`, `socket-parser`, `typescript-config`, `cli`).
- `.changeset/`: release notes/versioning metadata.
- `infra/`, `docker-compose.yml`: local infrastructure and deployment support.

Keep feature code in each workspace’s `src/`. Keep tests either next to source (`*.spec.ts`) or in workspace `test/` folders for e2e.

## Build, Test, and Development Commands

Run from repository root unless noted.

- `pnpm dev`: start all workspaces in development mode via Turbo.
- `pnpm build`: build all apps/packages.
- `pnpm lint`: run `oxlint` across workspaces.
- `pnpm format`: format with Prettier (`pnpm format --check` in CI).
- `pnpm test`: run test pipelines for all workspaces.
- `pnpm test:e2e`: run e2e suites where configured.
- `pnpm --filter @lootlog/api test`: run one workspace only (replace package name as needed).

## Coding Style & Naming Conventions

- Language: TypeScript-first, Node.js `>=20`.
- Formatting: 2-space indentation, LF endings, final newline (`.editorconfig`).
- Lint/format: `oxlint` + Prettier.
- Commit small, focused changes; avoid unrelated refactors.
- Follow existing naming patterns:
  - kebab-case file names (example: `event-respawn.service.ts`, `player-search-tile.tsx`)
  - NestJS conventions (`*.module.ts`, `*.service.ts`, `*.controller.ts`).

## Testing Guidelines

- Backend services use Jest; unit tests are usually `*.spec.ts`.
- E2E tests live in `apps/*/test/*.e2e-spec.ts`.
- `apps/game-client` uses Vitest (`vitest.config.ts`, `*.test.ts`).
- Add or update tests for behavior changes before opening a PR.
- Use targeted runs while iterating: `pnpm test --filter @lootlog/<workspace>`.

## Commit & Pull Request Guidelines

- Commits must follow Conventional Commits (enforced by commitlint): `feat`, `fix`, `docs`, `chore`, `style`, `refactor`, `ci`, `test`, `revert`, `perf`.
- Example: `fix(api): handle missing guild permissions`.
- PRs should use `.github/PULL_REQUEST_TEMPLATE.md`: include summary, linked issues, affected components, test steps/results, and UI screenshots when applicable.
- For functional changes in packages/apps, create a changeset: `pnpm changeset`.

## Security & Configuration Tips

- Never commit secrets or `.env` files.
- Generate/update env values with `pnpm env:generate`; reflect new variables in `.env.sample`.
- For schema changes, include migration and client-generation steps for the affected service (`api`, `battlelog-service`, `auth`).
