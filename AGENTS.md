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
- See `.oxlintrc.md` for the full linting configuration.

## React

- React Compiler handles memoization — do not use `memo`, `useMemo`, or `useCallback`.
- Never create two or more components in the same file. Follow the principle: one file, one component.
- The web app (`apps/web`) is not SSR.
- All static text in frontend apps must use i18n — never hardcode user-facing strings.

## Git and Commits

- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) as defined in [`commitlint.config.js`](commitlint.config.js).
- Allowed commit types: `feat`, `fix`, `docs`, `chore`, `style`, `refactor`, `ci`, `test`, `revert`, `perf`.
- Never use `--no-verify` or otherwise bypass verification hooks. If a hook fails, fix the underlying issue or report the blocker instead of skipping checks.

## Refactoring

- When deduplicating code, do not preserve old files as re-export wrappers. Update all imports and delete the old files.

## Additional Notes

- Don't try to run the app, assume it's already running.
