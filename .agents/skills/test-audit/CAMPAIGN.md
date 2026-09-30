# Test-pruning campaign

Campaign mode prunes one subsystem's whole test surface in one change: an app
such as `apps/gateway`, one service area such as battle submission in
`apps/api`, or one package. The value bar, retention bar, candidate evidence,
and validation in [SKILL.md](SKILL.md) apply to every lane. This file adds the
order of work. Each step ends on its completion criterion; do not start the
next step early.

## 1. Baseline

Record the subsystem's test and support line counts and every test file's
pass/fail state, including `test:integration` and `test:e2e` suites, at a
pinned `main` SHA. Keep baseline failures in their own list: a failing test is
often a real product bug, not a stale test.

Done when every in-scope test file has a recorded baseline result.

## 2. Lanes and inventory

Split the surface into **lanes** along production owner boundaries, not file
prefixes. For `apps/gateway` these would be auth, guilds, HTTP API, RabbitMQ
consumers, realtime delivery, platform, and the shared fixtures in `test/`.
Include the subsystem's cases at shared package boundaries, its integration
and end-to-end suites, and its benchmarks.

Done when every test file the subsystem owns belongs to exactly one lane.

## 3. Read-only ledger per lane

Give each lane to its own read-only agent. The agent reads every assigned test
in full, including parameter tables. It also reads the production owners and
their entry points, callers, history, and the workspace test scripts. Each
test declaration goes into a written **ledger** with one mark. An `it.each` is
one declaration unless its rows need different marks; then mark each row.

- `R`: retain, naming the contract and the bug it catches; a retained test that
  only moves to a better-named file stays `R` with the move noted;
- `F`: retain the contract but repair the assertion, such as a vacuous negative
  that passes when only one of several items is missing;
- `C`: consolidate, naming the owner that absorbs the assertion first: a sibling
  table case, a stronger boundary suite, or the shared owner in another package;
- `D`: delete, naming the proof that remains, or why no contract exists.

Judge a test by its assertions, not its name: a test named for clearing a
state may assert that the state was _not_ cleared.

Done when every declaration in the lane has a mark and an evidence line.

## 4. Layer plan per lane

Treat the per-test ledger as input, not as the edit list. A second read-only
pass, starting from the ledger, looks for the redundant **layer**: several
suites replaying the same shared logic through one mocked collaborator around
a stronger suite that exercises the real boundary. Name the **keeper** suite
for each contract. Prefer the real transport boundary with a fake network, or
a testcontainers-backed integration suite, over a mocked collaborator. Correct
any ledger errors this pass finds.

Done when each lane plan names its retired files, its keeper per contract, the
assertions to carry into keepers, and the test-only production seams unlocked.

## 5. Cutover

Edit lane by lane. Serialize changes to shared harnesses and fixtures through
one owner. With each lane, remove the test-only production seams it unlocks:
injection parameters, getters, reset exports, and indirection layers. Register
moved integration suites in the workspace `test:integration` script. Record
durable test-ownership rules in the Verification section of the root
`AGENTS.md`, the repository's only one, and only rules drawn from mistakes this
campaign actually found.

Done when every lane plan is applied and each lane's keepers pass.

## 6. Preservation review

Before claiming completion, have independent reviewers compare deleted
coverage against the keepers, one reviewer per boundary group. They look for
contracts that lost their only proof. They also look for new assertions that
cannot fail, such as a rejection row the production code never reaches.

For each restored contract, make one deliberate **mutation** of the production
owner and confirm the keeper goes red. Then restore the source byte for byte.

Done when every reported gap is restored or rejected with source evidence, and
every restored contract has a caught mutation.

## 7. Product defects

A baseline failure that survives into a keeper is a bug report. Fix it at its
owner as a separate commit, and prove it through the real user flow against the
running application, with a **control** run that reverts the fix and shows the
old behavior. Record unrelated product discrepancies you find as follow-ups
instead of fixing them in the campaign.

Done when each repaired defect has a failing control and a passing candidate
on the same harness.

## 8. Reconcile and hand off

Campaigns outlive many `main` commits. Merge `main` rather than rebasing a
long, many-commit campaign. When `main` modified a file the campaign
deleted, keep the deletion. Port the new contract into the keeper instead, and
confirm every new regression `main` added still has a home. Rerun the whole
subsystem suite, including integration suites, on the merged head.

Expect review tooling to see a truncated file list on a diff this large.

Hand off with the [SKILL.md](SKILL.md) report, plus:

- baseline and final test/support line counts, with production counted separately;
- lanes, retired layers, and keepers;
- preservation gaps found and their mutations;
- product defects with control and candidate proof.
