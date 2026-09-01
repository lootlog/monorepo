# Baseline results

Baseline: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`.

## Recorded gates

The established sequential baseline is green:

| Order | Command          | Result |
| ----: | ---------------- | ------ |
|     1 | `pnpm lint`      | pass   |
|     2 | `pnpm typecheck` | pass   |
|     3 | `pnpm test`      | pass   |
|     4 | `pnpm build`     | pass   |

These are the agreed baseline results for the rewrite. The documentation inventory did not rerun the full suite because other implementation tasks share the checkout; it verified that the checkout started at the exact baseline SHA and that the command graph still declares the four root gates.

## Known concurrency defect

Running all Turbo tasks concurrently can launch overlapping Prisma generation for shared output directories. The runs race and may fail or replace generated files while another task reads them. Sequential `lint`, `typecheck`, `test`, and `build` remain green.

Treat this as a baseline toolchain defect:

- do not update golden output to mask it;
- serialize each Prisma generation owner until Prisma is removed;
- ensure Bun/Turbo tasks give every generated tree a single writer;
- add a deterministic double-generation check before deleting the baseline exception.

## Baseline assertions

- Five committed OpenAPI files contain exactly 243 operations: Activity 9, API 199, Auth 4, Battlelog 26, Search 5.
- Every operation has an operation ID; the complete per-service lists are in `contracts.tsv`.
- The monorepo contains 30 workspace manifests at the baseline: 14 applications and 16 packages.
- API and Activity use Prisma; Auth and Battlelog use Drizzle; Activity has effective one-day TimescaleDB chunks and seven-day retention.
- Gateway is Socket.IO with Redis federation; Web and Game client are its browser consumers.
- No `.env` file or secret value was read during inventory.

## Rewrite acceptance delta

At handoff, replace the pnpm commands with the planned Bun gates and add OpenAPI parity, deterministic client generation, DDL parity, container integration, realtime, shutdown, and performance evidence. A green unit/build suite alone does not prove the rewrite complete.
