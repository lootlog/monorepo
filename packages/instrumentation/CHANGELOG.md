# @lootlog/instrumentation

## 0.0.4

### Patch Changes

- 2b571ba: Use unit-aware HTTP latency histogram buckets for accurate duration percentiles.
- 2b571ba: Exclude health probes from HTTP telemetry and identify each service replica in
  exported OpenTelemetry resources.
- 2b571ba: Send application telemetry to the self-hosted observability stack, emit
  structured JSON logs with active trace context, and remove the Axiom transport.

## 0.0.3

### Patch Changes

- 7742f4f: Remove unused Hono-specific helpers, configuration, documentation, and dependency declarations.

## 0.0.2

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.

## 0.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
