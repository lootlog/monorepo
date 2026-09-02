# @lootlog/instrumentation

Shared OpenTelemetry bootstrap helpers for Lootlog services.

## Overview

- Provides startup helpers for NestJS services.
- Centralizes OTLP exporter setup, sampling defaults, metric views, and guardrails against high-cardinality telemetry.
- Is intended to be imported before the rest of the application bootstraps.

## Exports

- `@lootlog/instrumentation/instrumentation-nest` exports `initObservability`, `shutdownObservability`, and `ObservabilityConfig`.

## Development

Run commands from the monorepo root:

```bash
bun run --filter=@lootlog/instrumentation build
```

## Notes

- The Nest helper lives in `src/instrumentation-nest.ts`.
- Local environments are disabled by default unless explicitly forced through config.
