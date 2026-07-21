# Hot-path benchmark harness

Run the deterministic suite from the repository root:

```sh
pnpm --filter @lootlog/game-client bench:hot-paths
```

The default protocol uses 8 warmups and 25 measured samples. It writes
`artifacts/hot-path-benchmarks/hot-paths.json` and `hot-paths.md` inside the
game-client package.

Configuration is passed through environment variables:

- `BENCH_BASELINE`: JSON report to compare against the new candidate.
- `BENCH_WARMUPS` and `BENCH_SAMPLES`: positive iteration counts.
- `BENCH_COLLECT_HEAP=0`: disables retained-heap measurement.
- `BENCH_OUTPUT_DIR`: changes the default output directory.
- `BENCH_JSON` and `BENCH_MARKDOWN`: override individual output paths.

The command exits non-zero when a hard publication/listener assertion fails,
when draining the maximum 1,000-event startup queue exceeds 8 ms at p95, or
when comparison exceeds one of these gates:

- median: over 10% and over 0.25 ms for microbenchmarks or 2 ms for E2E;
- p95: over 15%;
- retained heap: over 10% and over 1 MiB.

`legacy-baseline.json` contains the four directly comparable scenarios measured
before this harness was introduced (Apple M5 Pro, Node 24.16, 8 warmups and 25
samples). CI uses it only when the pull request base predates the harness. Once
the base contains the harness, CI always measures that exact revision instead.
