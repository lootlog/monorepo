// src/observability.ts
// CRITICAL: This file MUST be imported/required BEFORE any other imports in your app!
// Use: node --import ./instrumentation.js ./dist/main.js
// Or:  node --require ./instrumentation.js ./dist/main.js

import {
  type Context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { envDetector, resourceFromAttributes } from "@opentelemetry/resources";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";
import {
  PeriodicExportingMetricReader,
  AggregationType,
  InstrumentType,
  createAllowListAttributesProcessor,
  type ViewOptions,
} from "@opentelemetry/sdk-metrics";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  BatchSpanProcessor,
  type SpanProcessor,
  type ReadableSpan,
  type Span,
} from "@opentelemetry/sdk-trace-base";

export interface ObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  otlpHeaders?: string;
  serviceEnvironment?: string;
  serviceNamespace?: string;
  traceSampleRate?: number;
  forceEnable?: boolean;
  enableDebugLogging?: boolean;
  // New: control what metrics to include
  enableHostMetrics?: boolean;
  enableProcessMetrics?: boolean;
}

let sdkInstance: NodeSDK | null = null;
let currentServiceName = "";

/**
 * Custom SpanProcessor that filters high-cardinality spans before export.
 * NOTE: Now only filters Socket.IO related spans, NOT all client spans.
 */
class FilteringSpanProcessor implements SpanProcessor {
  constructor(private readonly wrappedProcessor: SpanProcessor) {}

  onStart(span: Span, parentContext: Context): void {
    this.wrappedProcessor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (this.shouldDropSpan(span)) {
      return;
    }
    this.wrappedProcessor.onEnd(span);
  }

  private shouldDropSpan(span: ReadableSpan): boolean {
    const spanName = span.name;
    const attributes = span.attributes;

    // REMOVED: Don't drop ALL CLIENT spans - this breaks distributed tracing!
    // Only filter specific high-cardinality patterns

    // Drop Socket.IO room/namespace spans (high cardinality)
    if (
      spanName.includes("socket.io") ||
      spanName.match(/room:[a-zA-Z]+-?\d+/) ||
      spanName.match(/namespace:[a-zA-Z]+-?\d+/) ||
      spanName.includes("emit to") ||
      spanName.includes("send to")
    ) {
      return true;
    }

    // Drop spans with messaging destinations containing actual IDs
    const messagingDest = attributes["messaging.destination"]?.toString();
    if (
      messagingDest &&
      (messagingDest.match(/[a-zA-Z]+:\d+/) ||
        messagingDest.includes("guild:") ||
        messagingDest.includes("battle:"))
    ) {
      return true;
    }

    // Drop spans with actual room IDs like "guild:123" or "battle:456"
    if (spanName.match(/[a-zA-Z]+:\d+/)) {
      return true;
    }

    return false;
  }

  shutdown(): Promise<void> {
    return this.wrappedProcessor.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.wrappedProcessor.forceFlush();
  }
}

function normalizePath(path: string | undefined | null): string {
  const normalized = (path ?? "/").split("?")[0] || "/";

  // Preserve special routes
  if (normalized === "/guilds/@me") return normalized;
  if (normalized === "/healthz") return normalized;

  // Parameterize path segments after known prefixes
  const prefixes = [
    "/guilds/",
    "/loots/",
    "/users/",
    "/timers/",
    "/internal/guilds/",
    "/battles/",
    "/battles/public/",
  ];

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      const rest = normalized.slice(prefix.length);
      const segments = rest.split("/");

      const knownSubResources = [
        "timers",
        "members",
        "chat-messages",
        "permissions",
        "worlds",
        "lootlog-config",
        "accounts",
        "user-permissions",
        "raw",
      ];

      for (let i = 0; i < segments.length; i++) {
        if (
          segments[i] &&
          !knownSubResources.includes(segments[i] as string) &&
          segments[i] !== "@me"
        ) {
          segments[i] = ":id";
        }
      }

      return prefix + segments.join("/");
    }
  }

  // Fallback for unknown routes
  return normalized
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    )
    .replace(/\/[0-9]+/g, "/:id");
}

/**
 * Create metric views to control cardinality.
 * This is CRITICAL for preventing Grafana Cloud cardinality breaches.
 */
function createMetricViews(): ViewOptions[] {
  return [
    // HTTP server metrics - limit to essential attributes only
    {
      instrumentName: "http.server.duration",
      attributesProcessors: [
        createAllowListAttributesProcessor([
          "http.method",
          "http.route",
          "http.status_code",
        ]),
      ],
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      },
    },
    {
      instrumentName: "http.server.request.size",
      attributesProcessors: [
        createAllowListAttributesProcessor(["http.method", "http.route"]),
      ],
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      },
    },
    {
      instrumentName: "http.server.response.size",
      attributesProcessors: [
        createAllowListAttributesProcessor(["http.method", "http.route"]),
      ],
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      },
    },
    {
      instrumentName: "http.server.request.duration",
      attributesProcessors: [
        createAllowListAttributesProcessor([
          "http.request.method",
          "http.route",
          "http.response.status_code",
        ]),
      ],
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      },
    },

    // Process metrics - drop high-cardinality attributes
    // Only keep service-level attributes, drop per-process details
    {
      instrumentName: "process.*",
      attributesProcessors: [createAllowListAttributesProcessor([])], // Drop all extra attributes
    },

    // System metrics - aggregate across all CPUs/disks/network interfaces
    {
      instrumentName: "system.cpu.*",
      attributesProcessors: [createAllowListAttributesProcessor(["state"])], // Only keep state (user, system, idle), drop cpu number
    },
    {
      instrumentName: "system.memory.*",
      attributesProcessors: [createAllowListAttributesProcessor(["state"])],
    },
    {
      instrumentName: "system.network.*",
      attributesProcessors: [createAllowListAttributesProcessor(["direction"])], // Only keep direction, drop interface name
    },
    {
      instrumentName: "system.disk.*",
      attributesProcessors: [createAllowListAttributesProcessor(["direction"])], // Only keep direction, drop device name
    },
    {
      instrumentName: "system.filesystem.*",
      attributesProcessors: [createAllowListAttributesProcessor(["state"])], // Drop mountpoint, device, type, mode
    },

    // Catch-all for any remaining high-cardinality metrics - DROP them
    // This is aggressive but prevents cardinality explosion
    {
      instrumentType: InstrumentType.HISTOGRAM,
      instrumentName: "*",
      // Keep only service-level attributes for unmatched histograms
      attributesProcessors: [
        createAllowListAttributesProcessor([
          "http.method",
          "http.route",
          "http.status_code",
          "rpc.method",
          "rpc.service",
        ]),
      ],
    },
  ];
}

export function initObservability(config: ObservabilityConfig): void {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    serviceNamespace,
    traceSampleRate = 0.1,
    forceEnable = false,
    enableDebugLogging = false,
    enableHostMetrics = false, // DISABLED BY DEFAULT due to cardinality
    enableProcessMetrics = false, // DISABLED BY DEFAULT due to cardinality
  } = config;

  // Enable debug logging if requested - helps diagnose issues
  if (enableDebugLogging) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  // Disable for local/dev unless explicitly forced
  if (!forceEnable && (serviceEnvironment === "local" || !serviceEnvironment)) {
    console.log(
      `[${serviceName}] Observability disabled for local environment.`,
    );
    return;
  }

  if (!otlpEndpoint || !otlpHeaders) {
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

  // Use sync detectors to avoid issues - and limit which ones to use
  // IMPORTANT: These can add high-cardinality labels!
  const detectors = [
    envDetector,
    // Only include these if you really need them
    // hostDetectorSync,  // Adds host.name, host.id, etc.
    // osDetectorSync,    // Adds os.type, os.description, etc.
    // processDetectorSync, // Adds process.pid - HIGH CARDINALITY!
  ];

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(traceSampleRate),
  });

  const instrumentations = getNodeAutoInstrumentations({
    // HTTP instrumentation - server side only
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      // IMPORTANT: Ignore outgoing requests to prevent cardinality explosion
      // from external services (Discord, Redis, Cloudflare, etc.)
      ignoreOutgoingRequestHook: () => true,
      requestHook: (span: any, req: any) => {
        try {
          const url: string =
            req?.url ?? req?.path ?? req?.raw?.url ?? req?.originalUrl ?? "/";
          const path = normalizePath(url);
          const method: string = req?.method ?? req?.raw?.method ?? "HTTP";

          // Always set normalized route to prevent cardinality from raw URLs
          span.updateName(`${method} ${path}`);
          span.setAttribute("http.route", path);
        } catch {
          // ignore hook errors
        }
      },
    },

    "@opentelemetry/instrumentation-express": { enabled: true },
    "@opentelemetry/instrumentation-fastify": { enabled: true },

    // DISABLE high-cardinality instrumentations
    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-net": { enabled: false },
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-pg": { enabled: false },
    "@opentelemetry/instrumentation-mysql": { enabled: false },
    "@opentelemetry/instrumentation-mysql2": { enabled: false },
    "@opentelemetry/instrumentation-redis": { enabled: false },
    "@opentelemetry/instrumentation-ioredis": { enabled: false },
    "@opentelemetry/instrumentation-mongodb": { enabled: false },
    "@opentelemetry/instrumentation-grpc": { enabled: false },
    "@opentelemetry/instrumentation-graphql": { enabled: false },
    "@opentelemetry/instrumentation-aws-sdk": { enabled: false },
    "@opentelemetry/instrumentation-socket.io": { enabled: false },
    "@opentelemetry/instrumentation-amqplib": { enabled: false },
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers: parseHeaders(otlpHeaders),
  });

  const batchProcessor = new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
  });

  const filteringProcessor = new FilteringSpanProcessor(batchProcessor);

  const nestInstrumentation = new NestInstrumentation();

  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
    headers: parseHeaders(otlpHeaders),
  });

  sdkInstance = new NodeSDK({
    resource: resourceFromAttributes(resourceAttributes),
    resourceDetectors: detectors,
    sampler,
    spanProcessor: filteringProcessor,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000, // 1 minute - don't export too frequently
    }),
    views: createMetricViews(),
    instrumentations: [instrumentations, nestInstrumentation],
  });

  try {
    sdkInstance.start();

    // DON'T start HostMetrics by default - it causes cardinality explosion!
    // If you need runtime metrics, use a separate, controlled metrics collection
    // Or use Views to aggressively limit cardinality (already done above)
    if (enableHostMetrics) {
      console.warn(
        `[${serviceName}] HostMetrics enabled - watch for cardinality issues!`,
      );
      // Import dynamically to avoid loading if not needed
      import("@opentelemetry/host-metrics").then(({ HostMetrics }) => {
        const hostMetrics = new HostMetrics({
          name: `${serviceName}-runtime`,
        });
        hostMetrics.start();
      });
    }

    console.log(
      `[${serviceName}] Observability initialized (sampling: ${
        traceSampleRate * 100
      }%, HTTP client disabled, cardinality-controlled metrics).`,
    );
  } catch (error: unknown) {
    console.error(
      `[${serviceName}] Observability initialization failed:`,
      error,
    );
    sdkInstance = null;
  }
}

export async function shutdownObservability(): Promise<void> {
  if (!sdkInstance) return;

  try {
    await sdkInstance.shutdown();
  } catch (error) {
    console.error(
      `[${currentServiceName}] Error shutting down observability:`,
      error,
    );
  } finally {
    sdkInstance = null;
    console.log(`[${currentServiceName}] Observability terminated`);
  }
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
