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
import { Resource, envDetector } from "@opentelemetry/resources";
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
  enableHostMetrics?: boolean;
  enableProcessMetrics?: boolean;
}

let sdkInstance: NodeSDK | null = null;
let currentServiceName = "";

/**
 * Custom SpanProcessor that filters high-cardinality spans before export.
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
    // But NOT route templates like "/guilds/:id"
    if (spanName.match(/[a-zA-Z]+:\d+/) && !spanName.includes("/:")) {
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

/**
 * Create metric views to control cardinality.
 */
function createMetricViews(): View[] {
  return [
    // HTTP server metrics - limit to essential attributes only
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
    new View({
      instrumentName: "http.server.request.duration",
      attributeKeys: [
        "http.request.method",
        "http.route",
        "http.response.status_code",
      ],
      aggregation: Aggregation.Histogram(),
    }),
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
    enableHostMetrics = false,
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

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(traceSampleRate),
  });

  // Auto-instrumentations - NO requestHook, let Express/NestJS set http.route
  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      ignoreOutgoingRequestHook: () => true,
      // NO requestHook - let Express instrumentation handle http.route from your decorators
    },

    "@opentelemetry/instrumentation-express": { enabled: true },
    "@opentelemetry/instrumentation-fastify": { enabled: true },

    // Disable high-cardinality instrumentations
    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-net": { enabled: false },
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-pg": { enabled: false },
    "@opentelemetry/instrumentation-mysql": { enabled: false },
    "@opentelemetry/instrumentation-mysql2": { enabled: false },
    "@opentelemetry/instrumentation-redis": { enabled: false },
    "@opentelemetry/instrumentation-redis-4": { enabled: false },
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
    resource: new Resource(resourceAttributes),
    resourceDetectors: [envDetector],
    sampler,
    spanProcessor: filteringProcessor,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    }),
    views: createMetricViews(),
    instrumentations: [instrumentations, nestInstrumentation],
  });

  try {
    sdkInstance.start();

    if (enableHostMetrics) {
      console.warn(
        `[${serviceName}] HostMetrics enabled - watch for cardinality issues!`,
      );
      import("@opentelemetry/host-metrics").then(({ HostMetrics }) => {
        const hostMetrics = new HostMetrics({
          name: `${serviceName}-runtime`,
        });
        hostMetrics.start();
      });
    }

    console.log(
      `[${serviceName}] Observability initialized (sampling: ${traceSampleRate * 100}%).`,
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
