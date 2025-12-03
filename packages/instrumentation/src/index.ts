// src/observability.ts (np. entry dla @lootlog/instrumentation)

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HostMetrics } from "@opentelemetry/host-metrics";
import {
  Resource,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
} from "@opentelemetry/resources";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";
import {
  PeriodicExportingMetricReader,
  View,
  Aggregation,
  MeterProvider,
} from "@opentelemetry/sdk-metrics";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { inspect } from "node:util";

export interface ObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  otlpHeaders?: string;
  serviceEnvironment?: string;
  serviceNamespace?: string;
  traceSampleRate?: number; // 0.0–1.0, default 0.1 (10%)
  forceEnable?: boolean; // bypass ENV guard
}

let sdkInstance: NodeSDK | null = null;
let hostMetrics: HostMetrics | null = null;
let currentServiceName = "";

/**
 * Normalize an HTTP path to low-cardinality template:
 * - strips query string
 * - replaces numeric/uuid-like segments with ":id"
 */
function normalizePath(path: string | undefined | null): string {
  const raw = (path ?? "/").split("?")[0] || "/";
  return (
    raw
      // uuid / cuid / hashes etc. (6+ hex/word chars)
      .replace(/\/[0-9a-fA-F-]{6,}/g, "/:id")
      // purely numeric ids
      .replace(/\/[0-9]+/g, "/:id")
  );
}

/**
 * Initialize OpenTelemetry SDK with:
 * - low-cardinality HTTP span names (works for Hono, Nest/Express, Nest/Fastify)
 * - probabilistic sampling (default 10%)
 * - OTLP exporters for traces + metrics
 * - HTTP client instrumentation disabled (prevents cardinality explosion)
 * - Most database/network instrumentations disabled (metrics cardinality control)
 * - Metric views to limit attribute cardinality
 * - Node.js runtime metrics (CPU, memory, event loop, GC)
 */
export function initObservability(config: ObservabilityConfig): void {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    serviceNamespace,
    traceSampleRate = 0.1,
    forceEnable = false,
  } = config;

  // Disable for local/dev unless explicitly forced
  if (!forceEnable && (serviceEnvironment === "local" || !serviceEnvironment)) {
    // eslint-disable-next-line no-console
    console.log(
      `[${serviceName}] Observability disabled for local development environment.`,
    );
    return;
  }

  if (!otlpEndpoint || !otlpHeaders) {
    // eslint-disable-next-line no-console
    console.warn(
      `[${serviceName}] Observability skipped: OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_HEADERS not set.`,
    );
    return;
  }

  currentServiceName = serviceName;

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

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(traceSampleRate),
  });

  const instrumentations = getNodeAutoInstrumentations({
    /**
     * CRITICAL: Disable HTTP CLIENT instrumentation to prevent cardinality explosion.
     * External services (Discord, Redis, RabbitMQ, Cloudflare, etc.) were creating
     * thousands of unique metrics. We only track incoming HTTP (server-side).
     */
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      ignoreOutgoingRequestHook: () => true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestHook: (span: any, req: any) => {
        try {
          const url: string =
            req?.url ?? req?.path ?? req?.raw?.url ?? req?.originalUrl ?? "/";
          const path = normalizePath(url);
          const method: string = req?.method ?? req?.raw?.method ?? "HTTP";

          const hasHttpRoute =
            span.attributes?.["http.route"] ||
            span.attributes?.["http.target"] ||
            span.attributes?.["http.url"];

          if (!hasHttpRoute) {
            span.updateName(`${method} ${path}`);
            span.setAttribute("http.route", path);
          }
        } catch {
          // ignore hook errors
        }
      },
    },

    "@opentelemetry/instrumentation-express": { enabled: true },
    "@opentelemetry/instrumentation-fastify": { enabled: true },

    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-net": { enabled: false },
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-pg": { enabled: false },
    "@opentelemetry/instrumentation-mysql": { enabled: false },
    "@opentelemetry/instrumentation-mysql2": { enabled: false },
    "@opentelemetry/instrumentation-redis": { enabled: false },
    "@opentelemetry/instrumentation-redis-4": { enabled: false },
    "@opentelemetry/instrumentation-mongodb": { enabled: false },
    "@opentelemetry/instrumentation-grpc": { enabled: false },
    "@opentelemetry/instrumentation-graphql": { enabled: false },
    "@opentelemetry/instrumentation-aws-sdk": { enabled: false },
    "@opentelemetry/instrumentation-socket.io": { enabled: false },
    "@opentelemetry/instrumentation-amqplib": { enabled: false },
    "@opentelemetry/instrumentation-ioredis": { enabled: false },
  });

  const metricViews = [
    new View({
      instrumentName: "http.server.duration",
      attributeKeys: ["http.method", "http.route", "http.status_code"],
      aggregation: Aggregation.Histogram(),
    }),
    new View({
      instrumentName: "http.server.request.size",
      attributeKeys: ["http.method", "http.route"],
      aggregation: Aggregation.Histogram(),
    }),
    new View({
      instrumentName: "http.server.response.size",
      attributeKeys: ["http.method", "http.route"],
      aggregation: Aggregation.Histogram(),
    }),
  ];

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
      exportIntervalMillis: 60000,
    }),
    views: metricViews,
    instrumentations: [instrumentations],
  });

  try {
    sdkInstance.start();

    const meterProvider = new MeterProvider({
      resource: new Resource(resourceAttributes),
      readers: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${otlpEndpoint}/v1/metrics`,
            headers: parseHeaders(otlpHeaders),
          }),
          exportIntervalMillis: 60000,
        }),
      ],
      views: metricViews,
    });

    hostMetrics = new HostMetrics({
      meterProvider,
      name: `${serviceName}-runtime`,
    });
    hostMetrics.start();

    // eslint-disable-next-line no-console
    console.log(
      `[${serviceName}] Observability initialized (sampling: ${
        traceSampleRate * 100
      }%, HTTP client disabled, low-cardinality metrics + runtime metrics enabled).`,
    );
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      `[${serviceName}] Observability initialization failed:`,
      inspect(error, { depth: 2, colors: false }),
    );
    sdkInstance = null;
    hostMetrics = null;
  }
}

export async function shutdownObservability(): Promise<void> {
  if (!sdkInstance) return;

  await sdkInstance.shutdown();
  hostMetrics = null;
  sdkInstance = null;

  // eslint-disable-next-line no-console
  console.log(`[${currentServiceName}] Observability terminated`);
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
    if (detector) detectors.push(detector);
  }

  return detectors.length > 0
    ? detectors
    : [envDetector, hostDetector, osDetector, processDetector];
}

function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};

  // Convert comma separators to ampersands for URLSearchParams compatibility
  const paramsString = headersString.replace(/,/g, "&");
  const params = new URLSearchParams(paramsString);

  params.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}
