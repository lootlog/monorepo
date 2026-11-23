---
name: test-audit
description: Gate every new or changed test, and audit existing tests for low-value, implementation-coupled, or duplicative coverage and the test-only production seams they keep alive. Use when writing, changing, reviewing, or pruning tests.
---

# Test Audit

Three modes, one value bar. Authoring mode gates every new or changed test at
write time. Audit mode runs focused sweeps of tests that re-assert source,
duplicate stronger proof, couple behavior to implementation, or keep test-only
production seams alive. Continue broad audits as separate coherent follow-up
changes; optimize for confidence, not deletion count. Campaign mode prunes one
whole subsystem's test surface (every test file an app, service area, or
package owns); before starting one, read [CAMPAIGN.md](CAMPAIGN.md).

The [test policy](#test-policy) is the repository's baseline for what to test
and how. This skill adds the gate, the audit workflow, and the evidence a
deletion needs.

## Test policy

- Make tests wait on the milestone: await the promise, Deferred, Queue, or
  event that marks it, advance fake timers, or drive the Effect TestClock.
  The runner's timeout is the ceiling, so a test sets no timeout or retry of
  its own (container suites, `*.integration.test.ts` and `*.e2e.test.ts`,
  may). A skipped test names its tracking issue on the line above:
  `// quarantine: #1234 <why>`. The `lootlog` test rules enforce this.
- Tests must protect observable behavior, business invariants, real
  regressions, authorization boundaries, or meaningful integration contracts.
  Each test must answer: “What real regression would this catch?”
- Add tests only for a concrete logic regression: name the incorrect outcome
  they prevent. Prefer extending an existing behavioral test over creating a
  new suite or fixture. For mechanical replacements with standard-library or
  dependency utilities, rely on existing coverage; add tests only for Lootlog
  behavior that the replacement could change, not the utility itself.
- Never test the language, the runtime, or a framework primitive. A test whose
  assertions transcribe the implementation — an operator, a comparison, a
  nullish check, a default value, a type guard, a pass-through argument — proves
  only that JavaScript works. Delete it instead of writing it. Coverage is not a
  goal: a test earns its place by naming a realistic incorrect outcome a future
  change could produce, and by failing when that outcome occurs.
- For styling, layout, or copy-only changes, use existing visual inspection and
  lint/typecheck. Do not add tests for literal text rendering, CSS classes or
  values, DOM nesting, decorative animations, or the absence of deleted UI.
  Do not commit temporary design/verification pages unless explicitly requested.
- Skip tests that count symbols or modules, mirror private forwarding or wiring,
  restate the type system, validate their own fixtures instead of actual output,
  or merely exercise framework mechanics. Broad snapshots are not a substitute
  for behavioral assertions.
- Treat UI primitives copied from shadcn or wrapping Base UI (`components/ui`
  in any app, `packages/ui`) as vendored: the library owns their tests. Test
  them only where Lootlog adds logic of its own, such as value mapping or
  event forwarding; a `data-*` attribute, class, size variant, or a prop that
  passes straight through to the primitive is not Lootlog logic.
- Keep UI tests for meaningful behavior: authorization, user input, state
  transitions, persistence, failure recovery, and keyboard/accessibility
  interactions. Assert outcomes, not presentation details; remove incidental
  style and copy assertions from otherwise useful tests.
- Keep E2E fakes at genuine external boundaries. Verify resulting state, not
  only status codes, and never mock the unit under test or internal application
  layers.
- Prove a Redis Lua script against a real Dragonfly through testcontainers. A
  fake that re-implements the script in TypeScript proves only the fake; keep
  such a fake for the TypeScript logic around the script.
- Add contract or end-to-end coverage when a change crosses Game client, HTTP,
  RabbitMQ, gateway, or generated-client boundaries. Game client runtime,
  adapter, processor, projection, and domain-store changes require relevant
  characterization tests.
- Preserve golden expectations until an intended behavior change has been
  established independently. Documentation-only changes do not require
  application tests.


## Authoring gate

Before adding any test, answer four questions; a missing answer means do not
add it yet:

1. What observable behavior, invariant, or independent contract does it protect?
2. What credible regression makes it fail?
3. Why does existing coverage not already catch that failure? Each contract has
   one primary test owner at the strongest boundary; another layer needs its
   own distinct risk, such as a transport or lifecycle failure the owner cannot
   reach. Prefer extending a table-driven case or shared fixture over a
   near-duplicate test; consolidate duplicated setup in the same change.
4. Does it need a production seam (export, flag, wrapper, injection hook) that no
   production caller needs? If yes, move the test to the real boundary instead.

Then check the test against every [junk pattern](#junk-patterns); a match fails
the gate unless the [retention bar](#retention-bar) names the contract it
independently guards. A test that would break under behavior-preserving
refactoring is asserting implementation, not behavior; rewrite it at the
owning boundary before landing it.

Bug regression tests must fail on the pre-fix code for the intended reason and
pass after the owner-boundary repair. A regression test that never demonstrably
failed proves the mock, not the fix. One regression at the owner boundary
covers the bug; do not replay the same scenario at every layer it crosses
(Game client, HTTP, RabbitMQ, gateway, Web).

## Junk patterns

The shared checklist for both modes: the authoring gate rejects a new test that
matches one, and audits hunt for existing tests that do.

- assertion-free coverage probes;
- self-comparisons and identity copiers;
- copied fixtures, inventories, manifests, or export lists;
- exact source, import, or string greps;
- private predicate or call-shape tests duplicated at real boundaries;
- duplicate invocations of the same contract;
- workspace-local replays of a helper a shared package already tests;
- tests whose only purpose is preserving test-only exports, globals, or wrappers;
- dead production code whose only callers are tests;
- expected values produced by the helper or renderer under test;
- mocks that implement the asserted behavior, or one identical mock standing in
  for different APIs;
- fixtures that supply the receipt, admission, or callback ordering the owner
  should produce, or persistence asserted against a store the path never writes;
- tests that restate a declared flag, config, or Capability list instead of
  exercising the delivery, acknowledgement, or access decision it promises;
- negative controls that pass for an unrelated reason, such as a denial from a
  different guard, an Organization-scope rejection the path never reaches, or a
  validation error that fires before the check under test;
- names or fixtures that promise more than the input exercises, such as a
  "clears the timer" test asserting the timer was not cleared.

## Value bar

Tests justify their maintenance cost by protecting behavior, a credible
regression, or an independently meaningful contract. In an audit, an existing
test that must change for behavior-preserving source reorganization is suspect,
not automatically deletable; the authoring gate still rejects new ones.

Before judging a candidate, read the complete test and production owner, its
entry point, callers, callees, sibling implementations, overlapping tests, the
workspace `test` and `test:integration` scripts, and relevant history. Use
CodeGraph to trace callers. When the test claims dependency-backed behavior,
inspect the dependency source or types directly, under `repos/` when vendored.

## Discovery

Keep discovery read-only and report evidence before editing. For broad scope,
run parallel discovery lanes as read-only subagents:

- Game client (`apps/game-client`);
- Web app and public surfaces (`apps/web`, `apps/landing`, `apps/docs`,
  `apps/wiki`, `apps/developer`);
- backend services (`apps/api`, `apps/auth`, `apps/gateway`, `apps/battlelog`,
  `apps/activity`, `apps/search`, `apps/discord-bot`);
- shared packages, scripts, and tooling (`packages/`, `scripts/`, `tools/`);
- a cross-cutting pattern sweep.

Outside campaign mode, prefer a few high-confidence candidates over a large
speculative inventory. Hunt for the [junk patterns](#junk-patterns).

## Retention bar

Keep a test when it independently enforces a contract `AGENTS.md` protects:
Margonem runtime semantics (object, callback, `this`, exception, return value,
request count), Game client performance bounds, Organization isolation and
Capability checks, HTTP schemas and response statuses, RabbitMQ facts,
WebSocket events, generated clients, persisted data and migrations, consumer
idempotency under redelivery, userscript settings and stored preferences,
public battle links, or a public SDK contract. Also keep:

- Game client characterization tests for runtime, adapter, processor,
  projection, and domain-store behavior;
- golden expectations, until an intended behavior change is established
  independently;
- call ordering when order is observable behavior;
- regressions with a credible failure mode;
- source inspection when it is the cheapest independent guard: it fails when
  the contract changes (the user-facing key, byte, or path) and survives an
  identifier-only refactor;
- a retained test that fails on the baseline: treat it as a possible product
  bug, reproduce it, and repair the owner rather than deleting it.

Static or slow is not a deletion reason. A test that resembles implementation
may still be the independent contract; prove otherwise before removing it.

## Candidate evidence

Record every field below before editing. A missing field means the candidate is
not ready for deletion:

- exact test name and location;
- what failure it can actually detect;
- non-test callers of the covered production or support seam;
- stronger remaining owner-boundary proof, or why no proof is needed;
- relevant history and the reason the test or seam exists;
- production or test-support deletion unlocked;
- risk and the focused validation command.

## Edit shape

Choose one coherent owner-boundary batch. Delete obsolete test-only exports,
globals, wrappers, and dead production paths instead of preserving aliases.
Move retained regressions to their canonical owners. Consolidate repeated
package or dependency assertions into one generic contract.

Prefer net-negative production LOC. Do not add replacement tests that restate
the same implementation, and do not convert uncertain candidates into cleanup
to increase deletion counts.

## Validation

1. Run the smallest owner and sibling tests with the runner the workspace's
   `test` script uses: `bun --conditions=development test <path>` or
   `bunx vitest run <path>`, from the workspace directory.
2. `test` excludes `*.integration.*` suites. When a change touches one, run the
   workspace `test:integration` script (testcontainers needs Docker). It
   selects suites by the `.integration.` suffix, so a moved or renamed suite
   must keep it.
3. For removed source greps or contract assertions, run the command that owns
   the real contract, such as `bun run client:check`.
4. Run `bunx oxfmt <changed-paths>`, then `git diff --check`.
5. Run `bunx turbo run lint typecheck test --filter=<workspace>` for every
   affected workspace, and `bun run knip` to catch exports and files the
   deletion orphaned.
6. Inspect `git diff --numstat`; report production/tooling separately from
   tests and test support.
7. After final audit edits, have an independent reviewer (a fresh subagent or
   the `code-review` skill when available) compare deleted coverage against
   the remaining proof.

## Landing and continuation

Follow the Delivery section of `AGENTS.md`. Land one coherent change at a time;
after landing, refresh from current `main` and rerun read-only discovery for
the next high-confidence batch.

## Handoff

Report:

- root cause and removed low-value categories;
- production owner simplifications;
- retained false positives and why they remain valuable;
- focused and full proof actually run;
- production versus test LOC;
- commit, branch, or pull request state;
- named follow-ups.
