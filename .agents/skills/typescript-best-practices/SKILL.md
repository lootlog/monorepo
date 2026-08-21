---
name: typescript-best-practices
description: Apply this repository's TypeScript modeling and implementation discipline when reading, writing, reviewing, or refactoring .ts and .tsx files, especially public contracts, domain state, external-data boundaries, and shared packages.
---

# TypeScript best practices

Follow `AGENTS.md` and the repository lint configuration first.

## Model the data

- Use discriminated unions when code has real variants. Avoid bags of optional fields that permit invalid combinations.
- Keep the simplest total type. Introduce branded primitives or non-empty tuples only when they prevent a demonstrated class of mistakes.
- Derive types from authoritative schemas and existing values with `typeof`, `Pick`, `Omit`, `Parameters`, `ReturnType`, or generated contracts.
- Parse external data at HTTP, queue, storage, configuration, and browser boundaries. Keep it `unknown` until validation succeeds.
- Prefer exhaustive switches. Make unhandled variants fail type checking.

## Write honest TypeScript

- Avoid `any`, non-null assertions, and unchecked casts. When a library boundary requires a cast, keep it local and prove the invariant in code structure or a test.
- Prefer `satisfies` when validating an object without widening its literals.
- Use `===`, `??`, and optional chaining as specified by the project.
- Use one import per module and inline `type` specifiers for type-only names.
- Avoid nested ternaries. Use early returns or explicit branches.
- Use descriptive names and prefix genuinely unused variables with `_`.

## React

- Let React Compiler handle memoization. Do not add `memo`, `useMemo`, or `useCallback`.
- Keep one component per file.
- Route all static user-facing text through i18n.

## Verify

Test behavior through public seams. Prefer real framework primitives over mocks, and run the narrowest relevant typecheck, lint, and test tasks.
