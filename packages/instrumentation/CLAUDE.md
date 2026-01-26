# instrumentation

OpenTelemetry configuration for tracing and metrics.

## Exports

**NestJS:**
- `initObservability(config)` - Initialize tracing/metrics
- `shutdownObservability()` - Graceful shutdown

**Hono:**
- `initHonoObservability(config)` - Initialize for Hono services
- `shutdownHonoObservability()` - Graceful shutdown

## Features

- OTLP export to Grafana Cloud
- HTTP path normalization to prevent cardinality explosion
- Aggressive span filtering (disables DNS, FS, DB, Redis, Socket.IO)
- 10% trace sampling by default
- Minimal metric attributes (method, route, status code)

## Usage

```typescript
import { initObservability } from '@lootlog/instrumentation';

initObservability({
  serviceName: 'my-service',
  otlpEndpoint: process.env.OTLP_ENDPOINT,
});
```
