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
- Never use `--no-verify` or otherwise bypass verification hooks. If a hook fails, fix the underlying issue or report the blocker instead of skipping checks.

## Refactoring

- Do not create or preserve files that only re-export symbols. Update imports to the real module and delete re-export-only wrappers.

## Design Guidelines

- When working on `apps/web`, follow the design system defined in [`apps/web/design-guideline.md`](apps/web/design-guideline.md). All pages must use the unified layout patterns, design tokens, and component styling described there.

## Additional Notes

- Don't try to run the app, assume it's already running.
- ABSOLUTELY DON'T assume I need backwards compatibility unless explicitely told.
- If a sandbox restriction blocks a command needed for the task, immediately ask for approval to run it with elevated permissions instead of silently skipping it.
