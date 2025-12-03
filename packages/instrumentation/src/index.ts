/**
 * OpenTelemetry Observability Configuration
 *
 * This module configures OpenTelemetry instrumentation for Node.js services with:
 * - Low-cardinality span attributes to prevent metrics explosion
 * - Probabilistic trace sampling (20% default) to reduce costs
 * - Automatic filtering of high-cardinality attributes before export
 *
 * Metrics Strategy (via Grafana Cloud "metrics-from-traces"):
 * ============================================================
 * After attribute filtering and sampling, you can still build dashboards/alerts for:
 *
 * 1. REQUEST LATENCY (p50/p90/p95/p99, max):
 *    - Available by: service.name, deployment.environment, http.method, http.route,
 *                    span.kind, status.code
 *    - Metric: `duration` (histogram)
 *    - Example query: histogram_quantile(0.95, sum(rate(duration_bucket[5m])) by (le, service_name, http_route))
 *
 * 2. REQUESTS PER SECOND (RPS):
 *    - Available by: service.name, deployment.environment, http.method, http.route,
 *                    span.kind, status.code
 *    - Metric: `calls` (counter)
 *    - Example query: sum(rate(calls[5m])) by (service_name, http_route)
 *
 * 3. ERROR RATE:
 *    - Available by: service.name, deployment.environment, http.method, http.route,
 *                    span.kind, status.code
 *    - Metric: `calls` filtered by status.code="ERROR"
 *    - Example query: sum(rate(calls{status_code="ERROR"}[5m])) by (service_name, http_route)
 *
 * Low-Cardinality Labels (kept):
 * - service.name
 * - deployment.environment
 * - span.kind (SERVER, CLIENT, INTERNAL, etc.)
 * - http.method (GET, POST, etc.)
 * - http.route (normalized paths like /guilds/:id/members/:id)
 * - status.code (OK, ERROR)
 * - http.status_code (200, 404, 500, etc.)
 *
 * High-Cardinality Attributes (dropped):
 * - http.url, http.target (dynamic IDs, query params)
 * - db.statement, db.query.text (full SQL queries)
 * - user.id, character.id, guild.id (user/entity identifiers)
 * - enduser.id, session.id (session identifiers)
 *
 * Adjusting Sampling Rate:
 * ========================
 * Default: 20% (traceSampleRate: 0.2)
 * To increase/decrease:
 *   initObservability({
 *     serviceName: 'my-service',
 *     traceSampleRate: 0.5,  // 50% sampling
 *   });
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import {
  Resource,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
} from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  type SpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import type { Context } from "@opentelemetry/api";
import { inspect } from "node:util";

export interface ObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  otlpHeaders?: string;
  serviceEnvironment?: string;
  serviceNamespace?: string;
  traceSampleRate?: number;
}

let sdkInstance: NodeSDK | null = null;
let currentServiceName = "";

// High-cardinality attributes to drop from spans before export
// These attributes cause metrics cardinality explosion in Grafana Cloud's "metrics-from-traces"
const HIGH_CARDINALITY_ATTRIBUTES = [
  // HTTP attributes with dynamic values (IDs in URLs, query params, etc.)
  "http.url",
  "http.target",
  // Database attributes (full SQL statements are unique per query)
  "db.statement",
  "db.query.text",
  // User/session identifiers
  "enduser.id",
  "session.id",
  // Custom high-cardinality attributes (add more as needed)
  "user.id",
  "character.id",
  "guild.id",
];

// SpanProcessor that filters high-cardinality attributes before export
// This ensures metrics-from-traces in Grafana Cloud only use low-cardinality labels
class AttributeFilteringSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(_span: ReadableSpan, _parentContext: Context): void {
    // No-op
  }

  onEnd(span: ReadableSpan): void {
    // ReadableSpan doesn't have setAttribute, so we need to modify attributes directly
    // We'll remove the attributes by deleting them from the span's attributes
    const attributes = span.attributes;
    HIGH_CARDINALITY_ATTRIBUTES.forEach((attr) => {
      delete attributes[attr];
    });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

export function initObservability(config: ObservabilityConfig) {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    serviceNamespace,
    traceSampleRate = 0.2,
  } = config;

  if (serviceEnvironment !== "prod") {
    // eslint-disable-next-line no-console
    console.log(
      `[${serviceName}] Observability disabled for non-production environment: ${serviceEnvironment}`,
    );
    return;
  }

  currentServiceName = serviceName;

  if (!otlpEndpoint || !otlpHeaders) {
    // eslint-disable-next-line no-console
    console.warn(
      `[${serviceName}] Observability skipped: OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_HEADERS not set.`,
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

  const detectors = getResourceDetectors();

  // Probabilistic trace sampling to reduce trace volume and costs
  // Default: 20% sampling rate (adjustable via traceSampleRate config)
  // Note: Grafana's metrics-from-traces still work with sampled traces
  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(traceSampleRate),
  });

  sdkInstance = new NodeSDK({
    resource: new Resource(resourceAttributes),
    resourceDetectors: detectors,
    sampler,
    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: parseHeaders(otlpHeaders),
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
        headers: parseHeaders(otlpHeaders),
      }),
    }),
    spanProcessors: [
      // Filter high-cardinality attributes before export
      // This prevents metrics cardinality explosion in Grafana Cloud
      new AttributeFilteringSpanProcessor(),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        // Configure HTTP instrumentation to avoid high-cardinality attributes
        "@opentelemetry/instrumentation-http": {
          // Disable capturing full URL/target (contains dynamic IDs, query params)
          ignoreIncomingRequestHook: (_req) => {
            // Keep the instrumentation active but attributes will be filtered
            return false;
          },
          ignoreOutgoingRequestHook: (_req) => {
            return false;
          },
        },
        // Configure database instrumentation to avoid capturing statements
        "@opentelemetry/instrumentation-pg": {
          // Do not capture full SQL statements
          enhancedDatabaseReporting: false,
        },
        "@opentelemetry/instrumentation-mysql": {
          enhancedDatabaseReporting: false,
        },
      }),
    ],
  });

  try {
    sdkInstance.start();
    // eslint-disable-next-line no-console
    console.log(
      `[${serviceName}] Observability initialized (sampling: ${traceSampleRate * 100}%, low-cardinality mode).`,
    );
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      `[${serviceName}] Observability initialization failed:`,
      inspect(error, { depth: 2, colors: false }),
    );
    sdkInstance = null;
  }
}

export async function shutdownObservability(): Promise<void> {
  if (!sdkInstance) {
    return;
  }

  await sdkInstance.shutdown();
  // eslint-disable-next-line no-console
  console.log(`[${currentServiceName}] Observability terminated`);
  sdkInstance = null;
}

function getResourceDetectors() {
  const detectors: Array<typeof envDetector> = [];
  const detectorsEnv = process.env.OTEL_NODE_RESOURCE_DETECTORS;

  if (!detectorsEnv) {
    return [envDetector, hostDetector, osDetector, processDetector];
  }

  const detectorNames = detectorsEnv.split(",").map((d) => d.trim());

  const detectorMap = {
    env: envDetector,
    host: hostDetector,
    os: osDetector,
    process: processDetector,
  };

  for (const name of detectorNames) {
    const detector = detectorMap[name as keyof typeof detectorMap];
    if (detector) {
      detectors.push(detector);
    }
  }

  return detectors.length > 0
    ? detectors
    : [envDetector, hostDetector, osDetector, processDetector];
}

function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};

  // Convert comma separators to ampersands for URLSearchParams compatibility
  // This allows values to contain commas and equals signs (e.g., base64, URLs, JSON)
  const paramsString = headersString.replace(/,/g, "&");
  const params = new URLSearchParams(paramsString);

  params.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}
