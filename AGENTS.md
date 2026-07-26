# AI Agent Instructions

This file provides instructions for AI coding assistants working in this monorepo.

## Project Overview

This is a pnpm monorepo managed with Turborepo. It contains multiple apps (`apps/`) including a NestJS API, React frontend apps, and various microservices.

## Code Style

- Always use descriptive variable names.
- Avoid excessive comments — the code should be self-explanatory.
- Use `===` instead of `==`.
- Prefer `??` over `||` for nullish coalescing.
- Prefer `?.` for optional chaining.
- Prefix unused variables with `_`.
- Use `import type` for type-only imports.
- Do not split imports from the same module into separate statements for values and types; prefer a single import using inline `type` specifiers when needed.
- Avoid nested (chained) ternary expressions — use early returns or `if`/`else if` instead.
- See `.oxlintrc.md` for the full linting configuration.

## React

- React Compiler handles memoization — do not use `memo`, `useMemo`, or `useCallback`.
- Never create two or more components in the same file. Follow the principle: one file, one component.
- The web app (`apps/web`) is not SSR.
- All static text in frontend apps must use i18n — never hardcode user-facing strings.

## Git and Commits

- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) as defined in [`commitlint.config.js`](commitlint.config.js).
- Allowed commit types: `feat`, `fix`, `docs`, `chore`, `style`, `refactor`, `ci`, `test`, `revert`, `perf`.
- Pull request titles and descriptions must be written in English.
- Never use `--no-verify` or otherwise bypass verification hooks. If a hook fails, fix the underlying issue or report the blocker instead of skipping checks.

## Versioning and Changesets

- Add a changeset for every workspace whose runtime behavior, user-facing behavior, public contract, build output, or dependencies change.
- Include every directly affected workspace in the changeset. Internal runtime dependents are patched automatically by Changesets.
- Use `patch` for fixes and compatible internal improvements, `minor` for backwards-compatible features, and `major` for breaking consumer-facing changes.
- Write changeset summaries in clear English; they become changelog and GitHub Release entries.
- For workspace-only changes that do not require a release, such as tests, documentation, or non-release configuration, add an empty changeset with `pnpm changeset --empty`.
- Never edit package versions or generated changelogs manually, and never run `pnpm version`. The automated release pull request owns those changes.
- Releases are created only from `main`. Merging to `develop` may deploy dev but must never create release artifacts.
- Merging the Changesets version PR creates immutable Git tags, GitHub Releases, and Docker images. Production promotion requires approval of the `prod` environment.
- Production rollback or promotion must reuse an existing `prod-<semver>` image and update GitOps only. Never rebuild an image for rollback.

## Refactoring

- Do not create or preserve files that only re-export symbols. Update imports to the real module and delete re-export-only wrappers.

## Design Guidelines

- Treat [`DESIGN.md`](DESIGN.md) as the canonical Lootlog brand and visual system for `apps/landing`, `apps/web`, `apps/wiki`, and `apps/developer`. Apply its Persuade, Operate, and Read mode guidance instead of copying landing-page composition across surfaces.
- When working on `apps/web`, follow the design system defined in [`apps/web/design-guideline.md`](apps/web/design-guideline.md). All pages must use the unified layout patterns, design tokens, and component styling described there.

## Additional Notes

- Don't try to run the app, assume it's already running.
- ABSOLUTELY DON'T assume I need backwards compatibility unless explicitely told.
- If a sandbox restriction blocks a command needed for the task, immediately ask for approval to run it with elevated permissions instead of silently skipping it.
