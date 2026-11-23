# 0023. Build, tooling and test infrastructure

Status: accepted

## Context

Some modules are loaded by tools with restricted environments: Vite configs
under Node, deployment planning before dependencies are installed, JSON Schema
export, Tailwind's class scanner, Orval, and browser extension stores. Browsers
and extension runtimes reject or reinterpret output that the bundler considers
valid, and CI runner capacity is limited.

API integration tests run against disposable PostgreSQL (PGlite or containers)
and Dragonfly. Bun loads `.env` automatically, so tests need explicit guards to
never touch a developer's real databases.

## Decisions

### Restricted tool environments

- **`PUBLIC_SITE_ORIGINS`** (`packages/domain/src/public-sites.ts`): the module imports nothing, because Vite configs load it directly under Node.
- **`isObject`** (`scripts/deployment-input.ts`): deployment input parsing uses only built-in type guards, because deployment planning runs before dependencies are installed.
- **`CustomThemePreferenceSchema`** (`packages/schema/src/custom-theme.ts`): the pattern uses only the `u` flag, because JSON Schema exports drop patterns with other flags.
- **`INLINE_CLASS_NAMES`** (`packages/ui/src/components/portal-header.tsx`): each breakpoint's classes are spelled in full, because Tailwind detects only whole class names.

### Generated clients and contracts

- **`generate-openapi.ts`** (`apps/battlelog/src/openapi/generate-openapi.ts`): operations within each path item are sorted by HTTP method before serialization, because Effect stores endpoints in hash-based collections and operations sharing a path could swap order between processes, making generated clients look stale.
- **`mutatorsPath`** (`packages/client/scripts/generation.ts`): the client mutators stay plain function declarations in one file, because Orval reads each mutator's signature and the public SDK generates against the same file.
- **`fixRequestOptionsType`** (`packages/client/scripts/generation.ts`): generated operations are rewritten to type `options` with the mutator's own options type, because Orval types them as `RequestInit` while the mutators also accept a per-request client override.

### Game client and extension builds

- **`build.target`** (`apps/game-client/vite.shared.ts`): the JS build targets `BROWSER_TARGETS`, the same browsers as the CSS and Tailwind v4's baseline, because Margonem runs in current browsers and the extension requires Chrome 116 and Firefox 140, so ES2022 syntax ships without helpers.
- **`build.cssTarget`** (`apps/game-client/vite.shared.ts`): the CSS target is `BROWSER_TARGETS`, because Lightning CSS otherwise lowers `:is()` to `:-webkit-any()`, whose specificity lets the preflight reset beat Tailwind utilities in production builds only.
- **`stripColorMixFallbacks`** (`apps/game-client/vite.shared.ts`): Tailwind's `color-mix()` fallback declarations are stripped and their `@supports` blocks unwrapped, because every browser in `BROWSER_TARGETS` passes the check. Anything not in the expected minified single-rule shape is left untouched.
- **`escapeUnicodeNoncharacters`** (`apps/game-client/wxt.config.ts`): Unicode noncharacters in strings, templates, regexes and comments are escaped after minification, because Chrome refuses content scripts containing one (Lexical uses U+FFFF) and terser writes escapes back as literals. Escaping only these avoids making terser escape all non-ASCII.
- **`checkBuild`** (`apps/game-client/extension/check-build.ts`): the build check rejects Unicode noncharacters in bundled sources, because Chromium's `IsStringUTF8` rejects them in extension scripts even though `TextDecoder` accepts them.
- **Extension CSP** (`apps/game-client/wxt.config.ts`): non-production builds override the MV3 extension-pages `content_security_policy`, because Firefox's default policy upgrades local `ws://` to an unavailable `wss://`.
- **Bridge content script** (`apps/game-client/extension/entrypoints/bridge.content.ts`): the transferred `MessagePort` is accepted only after checking the window source and origin, so pages cannot reach extension capabilities through forged messages.

### Repository tooling

- **`generatedSourcePattern`** (`lint-staged.config.mjs`): lint-staged filters generated API client sources itself, because oxlint still lints files passed by path even when `.oxlintrc.json` ignores them.
- **lint-staged globs** (`lint-staged.config.mjs`): one glob per file type runs format then lint in sequence, because lint-staged runs different globs concurrently and lint must see the formatted file.
- **`CHANGELOG`** (`packages/changelog/src/entries.ts`): entries are one file each, named by id and bundled through a Vite glob, so a client shows exactly the changes of its commit and parallel pull requests do not conflict.
- **`fetch-reference-repositories.ts`** (`scripts/fetch-reference-repositories.ts`): each clone's `.git` is deleted, because a nested repository would hide `repos/` sources from editor and agent search.

- **Lint ratchet** (`scripts/lint-ratchet.ts`, `tools/oxlint/lootlog/budget.ts`): a rule configured with a `baseline` file reports a file only once its findings exceed the file's budget, and `bun run lint:ratchet` fails when a budget grows or when it can shrink, so existing findings never spread and reductions are locked in. The ratchet reads its rules from `.oxlintrc.json` and `.oxlintrc.react.json`, and a finding suppressed with a reason does not count.
- **`lootlog` oxlint plugin** (`tools/oxlint/lootlog`): its rules are ported from T3 Code's `oxlint-plugin-t3code` (MIT). Its `RuleTester` tests run under `node --test`, because `RuleTester` needs Node's raw AST transfer, which Bun lacks. A suppression reason goes after `--` in the directive, because a reason comment on the line above would be a prose comment. Fake-timer files (`useFakeTimers`, `setSystemTime`) are exempt from the wall-clock rule and from timer-based waits, because their clocks are driven by the test.
- **`check:changed`** (`scripts/check-changed.ts`): it derives affected packages from `turbo query affected` and `createDeploymentPlan`, the same plan CI's `plan` job uses, so a local pass predicts CI's fast checks; integration and e2e suites stay in CI.

### CI and deployment targets

- **`packagesWithScript`** (`scripts/deployment-targets.mjs`): test suites and producers are derived from package scripts, so a new suite or producer is never skipped for lack of a manual listing.
- **`isolatedWorkspacePackages`** (`scripts/deployment-targets.mjs`): `@lootlog/api`, `@lootlog/game-client` and `@lootlog/web` each get a dedicated CI runner, because each suite saturates a runner on its own; other packages share one.

### API test infrastructure

- **`bun.infrastructure-guard.ts`** (`apps/api/test/bun.infrastructure-guard.ts`): `apps/api/bunfig.toml` preloads it first, and it points every infrastructure address at an unresolvable host, because Bun loads `.env` into every `bun test` run and a suite without the e2e preload would truncate and flush the developer's real Postgres and Redis.
- **`createDatabaseBoundary`** (`apps/api/test/database-fixtures.ts`): the PGlite database is created with `pg_trgm`, because loot search migrations install it and PGlite offers only the extensions the client was created with.
- **`createMigratedDatabase`** (`apps/api/test/database-fixtures.ts`): migrations run through PGlite `exec` (the simple protocol), because the baseline migration contains multiple statements without Drizzle breakpoints.
- **`createDatabaseBoundary`** (`apps/api/test/database-fixtures.ts`): boundaries share only an immutable, private migrated image; live databases, transactions and disposal stay independent per boundary, even when acquired concurrently.

## Consequences

- Modules loaded by Node configs, pre-install scripts or schema exporters must keep their dependency and syntax restrictions; adding an import can break a tool that never runs the application.
- Game client and extension output must pass browser and store checks that bundlers do not enforce; the build checks are the guard.
- Generated OpenAPI documents and clients must be deterministic across processes.
- New tests rely on the infrastructure guard and disposable boundaries, never on local `.env` services.
- Adding a heavy test suite may need its own CI runner in `isolatedWorkspacePackages`.
