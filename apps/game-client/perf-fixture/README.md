# Game client browser performance fixture

The fixture builds the real userscript and loads it in system Chrome with mocked
Margonem globals and API/socket boundaries. It measures the notification ingress
pipeline, audio, overlay frame cost, raw CDP layout/style/paint traces, a 30-second
idle window, and a visual window matrix.

Run the enforced release matrix:

```sh
pnpm --filter @lootlog/game-client test:browser-perf
```

The default run covers NI and SI at 1× and 4× CPU with 2 warmups and 10 measured
samples. Results are written to `artifacts/browser-perf/results.json` and
`artifacts/browser-perf/report.md`; traces and PNGs live below the same directory.

The visual gate captures 80 real PNGs: 15 reachable production windows plus five
notification state cases (scroll, opacity 1/5, lock, and pointer drag), for NI/SI
and dark/light themes. It asserts expected case IDs, visible matching windows,
non-empty files, theme classes, notification types, scroll overflow, drag/lock
behavior, and zero console/page errors.

Two persisted state IDs are intentionally reported as exclusions:

- `create-notification` has no production renderer.
- `timer-settings-conflict` is unreachable while the production conflict path is
  disabled.

For a local smoke run:

```sh
BROWSER_PERF_QUICK=1 BROWSER_PERF_ENFORCE=0 pnpm --filter @lootlog/game-client test:browser-perf
```

The runner also accepts `BROWSER_PERF_INTERFACES`, `BROWSER_PERF_CPU_RATES`,
`BROWSER_PERF_SAMPLES`, `BROWSER_PERF_WARMUPS`, `BROWSER_PERF_IDLE_MS`,
`BROWSER_PERF_CHROME`, and `BROWSER_PERF_BUNDLE`.
