// src/observability-hono.ts
// For Hono.js services, you need middleware-based instrumentation
// Standard HTTP auto-instrumentation doesn't fully support Hono

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";
import {
  PeriodicExportingMetricReader,
  View,
  Aggregation,
} from "@opentelemetry/sdk-metrics";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

export interface HonoObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  otlpHeaders?: string;
  serviceEnvironment?: string;
  serviceNamespace?: string;
  traceSampleRate?: number;
  forceEnable?: boolean;
  enableDebugLogging?: boolean;
}

let sdkInstance: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK for Hono.js services.
 *
 * IMPORTANT: For Hono, you ALSO need to add the @hono/otel middleware to your app:
 *
 * ```typescript
 * import { Hono } from 'hono';
 * import { httpInstrumentationMiddleware } from '@hono/otel';
 *
 * const app = new Hono();
 * app.use('*', httpInstrumentationMiddleware({
 *   serviceName: 'my-hono-service',
 *   serviceVersion: '1.0.0',
 * }));
 * ```
 */
export function initHonoObservability(config: HonoObservabilityConfig): void {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    serviceNamespace,
    traceSampleRate = 0.1,
    forceEnable = false,
    enableDebugLogging = false,
  } = config;

  if (enableDebugLogging) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  if (!forceEnable && (serviceEnvironment === "local" || !serviceEnvironment)) {
    console.log(
      `[${serviceName}] Observability disabled for local environment.`,
    );
    return;
  }

  if (!otlpEndpoint || !otlpHeaders) {
    console.warn(
      `[${serviceName}] Observability skipped: missing OTLP config.`,
    );
    return;
  }

  const resourceAttributes: Record<string, string> = {
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
  };

  if (serviceEnvironment) {
    resourceAttributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = serviceEnvironment;
  }

  if (serviceNamespace) {
    resourceAttributes[SEMRESATTRS_SERVICE_NAMESPACE] = serviceNamespace;
  }

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(traceSampleRate),
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers: parseHeaders(otlpHeaders),
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
    headers: parseHeaders(otlpHeaders),
  });

  // For Hono, we don't use auto-instrumentations
  // The @hono/otel middleware handles HTTP spans
  sdkInstance = new NodeSDK({
    resource: new Resource(resourceAttributes),
    sampler,
    spanProcessor: new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    }),
    views: [
      new View({
        instrumentName: "http.server.duration",
        attributeKeys: ["http.method", "http.route", "http.status_code"],
        aggregation: Aggregation.Histogram(),
      }),
    ],
    // NO auto-instrumentations - Hono middleware handles it
    instrumentations: [],
  });

  try {
    sdkInstance.start();
    console.log(
      `[${serviceName}] Hono observability initialized (sampling: ${traceSampleRate * 100}%).`,
    );
    console.log(
      `[${serviceName}] Remember to add httpInstrumentationMiddleware from @hono/otel!`,
    );
  } catch (error) {
    console.error(
      `[${serviceName}] Observability initialization failed:`,
      error,
    );
    sdkInstance = null;
  }
}

export async function shutdownHonoObservability(): Promise<void> {
  if (!sdkInstance) return;
  await sdkInstance.shutdown();
  sdkInstance = null;
}

function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const paramsString = headersString.replace(/,/g, "&");
  const params = new URLSearchParams(paramsString);
  params.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

// =============================================================================
// EXAMPLE HONO APP SETUP
// =============================================================================
/*
// instrumentation.ts (load with --import or --require)
import { initHonoObservability } from './observability-hono';

initHonoObservability({
  serviceName: process.env.SERVICE_NAME || 'hono-service',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  serviceEnvironment: process.env.NODE_ENV,
  traceSampleRate: 0.1,
});

// app.ts
import { Hono } from 'hono';
import { httpInstrumentationMiddleware } from '@hono/otel';

const app = new Hono();

// Add OpenTelemetry middleware FIRST
app.use('*', httpInstrumentationMiddleware({
  serviceName: 'hono-service',
  serviceVersion: '1.0.0',
  // Optional: customize span names
  spanNameFactory: (c) => `${c.req.method} ${c.req.path}`,
}));

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
*/
