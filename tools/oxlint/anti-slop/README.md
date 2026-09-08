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

Run the plugin's behavioral regressions with:

```sh
bun test tools/oxlint/anti-slop
```

The tests run Oxlint against isolated fixtures and check both allowed boundary
cases and nearby violations that must remain errors. Keep these local corrections
when updating the copied plugin.
