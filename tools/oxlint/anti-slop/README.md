# Local anti-slop policy

The plugin is installed from the local `install-anti-slop` skill. All configured
rules remain errors. This copy includes tested corrections for integration
boundaries whose contracts cannot be replaced by domain-specific types.

- JSX attributes belong to a component's public API, like borrowed object
  members; the naming rule still checks locally owned component/variable names.
- Record type guards may establish `Record<string, unknown>`. Their values still
  require validation; `any` dictionaries are not exempt.
- `no-service-constructor-imports.nonServiceImports` names reviewed factories
  that do not construct contextual Effect services. Overrides are restricted to their
  importing files (`makeRuleId` creates an identifier; `makeJsonLogger` adapts
  Effect's logger).
  Type-only imports are always allowed: they introduce no runtime dependency.
  API map hydration and kill analytics compose query functions within their
  owning capabilities. The Ready Room Layer constructs its private Redis
  repository. These imports do not bypass contextual dependency acquisition.
- `boundaryFunctions` on the unknown-parameter, unknown-return, and runtime-typeof
  rules names reviewed raw decoders, serializers, or external adapters. It does
  not exempt nested callbacks. Use exact file overrides, not global name lists.
- `no-unsafe-dictionary-type.boundaryTypes` names reviewed raw document aliases
  in exact files. It does not exempt other aliases or inline dictionaries.
- `no-known-value-widening.boundaryBindings` permits named raw identity caches
  initialized or reset with null/undefined. Concrete values and local shadowing
  still trigger the rule.
- `no-module-mocking.externalModules` permits exact package specifiers in a
  reviewed test file. It does not permit relative paths, dynamic specifiers, or
  unlisted subpaths. The Lottie renderer needs a canvas unavailable in happy-dom;
  Sonner is an external notification renderer. Application modules remain subject
  to the normal rule.

API raw boundaries include schema decoder callbacks, Redis script result parsers,
Discord error normalization, versioned settings documents, and legacy persisted
NPC/presence projections. Keep coercion and fallback behavior in those adapters.
The kill statistics SQL adapter branches on its typed scalar-or-operator union;
that representation check does not indicate unvalidated input. Serializer/cache
ports retain their actual generic inputs rather than inventing domain types.

The generic stable JSON serializer accepts arbitrary input by design, including
values handled by JavaScript's JSON serialization semantics. The OpenAPI
compatibility walker operates on externally generated schema documents and
preserves extension fields while inspecting only relevant schema keywords.
These are raw format boundaries, not permission to pass unparsed values through
application services. Neither narrowing these contracts without evidence nor
moving checks behind new aliases/predicates is an acceptable lint fix.

Run the plugin's behavioral regressions from the repository root with:

```sh
bun test tools/oxlint/anti-slop
node --test "tools/oxlint/anti-slop/**/*.node-test.ts"
```

The `*.test.ts` files run Oxlint against isolated fixtures and check both
allowed boundary cases and nearby violations that must remain errors; they guard
the local corrections above. The `*.node-test.ts` files are the upstream
`RuleTester` suites for adopted rules. They need Node's raw-transfer parser,
which Bun does not provide, so they run under `node --test` (Node 22+). Keep the
local corrections when updating the copied plugin.

## Provenance

Updates follow `.agents/skills/install-anti-slop/references/update.md` as a
reviewed three-way merge, never a directory replacement.

- Base: the skill bundle installed on 2026-09-08 (`skills-lock.json` hash
  `91e87212…`, upstream v0.1.2 era).
- Incoming: `dmmulroy/anti-slop@c44ef22` (merged 2026-09-10; the skill bundle
  in `.agents/skills/install-anti-slop` matches this revision byte for byte).
- Adopted: `shared/scope.ts` (`resolveVariable` extraction), `shared/array-method.ts`,
  `rules/no-array-filter-map.ts`, `rules/no-reduce-accumulator-copy.ts`,
  `rules/require-readable-spacing.ts` with `vendor/eslint-stylistic/` (MIT,
  see its `UPSTREAM.md`), `effect/shared/tagged-values.ts`, and the Effect rules
  `no-manual-effect-error-tag`, `no-manual-tag-comparison`,
  `no-manual-tagged-construction`, `prefer-effect-match`. All are enabled at
  `error`; the Effect rules only in workspaces that declare `effect`.
- Retained local deviations from upstream: the option schemas and boundary
  exemptions described above in `effect/rules/no-service-constructor-imports.ts`,
  `rules/no-known-value-widening.ts`, `rules/no-module-mocking.ts`,
  `rules/no-reflect-apply.ts`, `rules/no-runtime-typeof.ts`,
  `rules/no-shape-in-symbol-names.ts`, `rules/no-unknown-parameters.ts`,
  `rules/no-unknown-returns.ts`, `rules/no-unsafe-dictionary-type.ts`, and
  `shared/function-parameters.ts`; the local `*.test.ts` suites and
  `shared/lint-fixture.ts`; `rules/require-readable-spacing-cli.node-test.ts`
  spawns the repository's `node_modules/.bin/oxlint` instead of `pnpm exec`.
- Deferred: none. The next update should diff against `c44ef22`.

Oxlint override `files` globs resolve relative to the config that declares
them, so workspaces with their own `.oxlintrc.json` (`apps/activity`,
`apps/auth`, `apps/battlelog`, `apps/discord-bot`, `apps/gateway`) enable the
Effect rules directly; the root override covers the remaining Effect
workspaces.
