---
name: engineering-rigor
description: Shape and verify non-trivial engineering changes that cross boundaries, alter contracts, migrate callers, or affect several workspaces. Use for architectural work, migrations, shared state, retries, public APIs, and changes where a locally correct edit may fail elsewhere.
---

# Engineering rigor

Make the smallest complete change that reaches the intended architecture.

## Shape

- Model the domain in data structures instead of scattered conditions.
- Concentrate parsing, validation, and framework adaptation at system boundaries.
- Prefer deep modules with small interfaces and low reader load.
- Remove dead code and redundant layers before adding abstractions.
- Redesign from the requirement as a first-class constraint instead of bolting on exceptions.

## Change

- Migrate every caller and delete the legacy internal API in the same change.
- Do not add compatibility layers unless the user explicitly requests backward compatibility.
- Delete re-export-only wrappers and import from the owning module.
- Separate concurrent writers before adding locks. When shared state is necessary, make operations idempotent across retries and partial failures.
- Break wide work into verifiable units. Keep every intermediate commit or phase coherent.

## Prove

- Reproduce defects before fixing them when practical.
- Verify the real artifact, not only a proxy such as compilation.
- Inspect the diff and generated output.
- Run targeted tests, typecheck, lint, and broader checks in proportion to risk.
- Add the required Changeset for every affected workspace, or an empty Changeset for workspace-only configuration.

Use `blast-radius` when the main risk lies outside the edited symbols.
