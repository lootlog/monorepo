# @lootlog/instrumentation

Shared OpenTelemetry bootstrap helpers for Lootlog services.

## Overview

- Provides startup helpers for NestJS and Hono services.
- Centralizes OTLP exporter setup, sampling defaults, metric views, and guardrails against high-cardinality telemetry.
- Is intended to be imported before the rest of the application bootstraps.

## Exports

- `@lootlog/instrumentation/instrumentation-nest` exports `initObservability`, `shutdownObservability`, and `ObservabilityConfig`.
- `@lootlog/instrumentation/instrumentation-hono` exports `initHonoObservability`, `shutdownHonoObservability`, and `HonoObservabilityConfig`.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/instrumentation build
```

## Notes

- The Nest helper lives in `src/instrumentation-nest.ts`.
- The Hono helper lives in `src/instrumentation-hono.ts`.
- Local environments are disabled by default unless explicitly forced through config.
