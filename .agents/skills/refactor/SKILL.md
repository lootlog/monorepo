---
name: refactor
description: Refactor existing code to reduce maintenance cost while preserving observable behavior. Use for focused cleanup, simplifying interfaces, removing duplication, and restructuring code that is difficult to change.
license: MIT
---

# Refactor

Make the smallest complete change that reduces a demonstrated maintenance problem. Follow `AGENTS.md` for compatibility, verification, and delivery.

## Understand

1. Identify the concrete problem and the behavior that must remain unchanged.
2. Trace the affected implementation and its callers. Use CodeGraph first when the repository is indexed.
3. Inspect existing abstractions, types, and tests before choosing a new structure.

## Change

- Reuse existing code and native features before adding abstractions.
- Delete dead code and redundant wrappers. Extract a function or module when it gives a coherent responsibility a useful interface; line count alone is not a reason to split code.
- Keep ownership and dependencies clear. Use `codebase-design` when the interface itself needs redesign.
- Preserve validation, error behavior, side effects, ordering, and public contracts. If the requested work also changes behavior, identify and verify that change explicitly.
- Keep steps reviewable and preserve unrelated working-tree changes. Follow repository delivery rules for commits; each editing step does not require a commit.

## Verify

Choose evidence in proportion to the changed behavior and risk. Reuse the existing test framework and run the checks required by the repository.

Add focused characterization coverage when behavior is subtle or insufficiently protected. A mechanical rename or similarly low-risk edit may be proven by typecheck, existing tests, and diff inspection without new tests. When an executable check is unavailable, report the limitation and the evidence actually obtained.

Inspect the final diff for accidental behavior changes, unnecessary abstractions, and incomplete caller migrations. Report what became simpler and how behavior preservation was checked.
