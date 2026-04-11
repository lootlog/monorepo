import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";
import {
  PeriodicExportingMetricReader,
  AggregationType,
  createAllowListAttributesProcessor,
  type ViewOptions,
} from "@opentelemetry/sdk-metrics";
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  BatchSpanProcessor,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { NodeSDK } from "@opentelemetry/sdk-node";
import { parseOtlpHeaders } from "./parse-otlp-headers.js";

export interface BaseObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  otlpHeaders?: string;
  serviceEnvironment?: string;
  serviceNamespace?: string;
  traceSampleRate?: number;
  forceEnable?: boolean;
  enableDebugLogging?: boolean;
}

interface ObservabilityComponents {
  resource: ReturnType<typeof resourceFromAttributes>;
  sampler: ParentBasedSampler;
  spanProcessor: SpanProcessor;
  metricReader: PeriodicExportingMetricReader;
}

export function shouldSkipObservability(
  config: BaseObservabilityConfig,
): boolean {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    forceEnable = false,
  } = config;

  if (!forceEnable && (serviceEnvironment === "local" || !serviceEnvironment)) {
    console.log(
      `[${serviceName}] Observability disabled for local environment.`,
    );
    return true;
  }

  if (!otlpEndpoint || !otlpHeaders) {
    console.warn(
      `[${serviceName}] Observability skipped: missing OTLP config.`,
    );
    return true;
  }

  return false;
}

export function createObservabilityComponents(
  config: BaseObservabilityConfig,
  createSpanProcessor?: (batchProcessor: BatchSpanProcessor) => SpanProcessor,
): ObservabilityComponents {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    serviceNamespace,
    traceSampleRate = 0.1,
    enableDebugLogging = false,
  } = config;

  if (enableDebugLogging) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
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

  const resource = resourceFromAttributes(resourceAttributes);

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(traceSampleRate),
  });

  const headers = parseOtlpHeaders(otlpHeaders!);

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers,
  });

  const batchProcessor = new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
  });

  const spanProcessor = createSpanProcessor
    ? createSpanProcessor(batchProcessor)
    : batchProcessor;

  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
    headers,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
  });

  return { resource, sampler, spanProcessor, metricReader };
}

export function createHttpServerMetricViews(): ViewOptions[] {
  return [
    {
      instrumentName: "http.server.duration",
      attributesProcessors: [
        createAllowListAttributesProcessor([
          "http.method",
          "http.route",
          "http.status_code",
        ]),
      ],
      aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM },
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
      aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM },
    },
  ];
}

export async function shutdownSdk(
  sdkInstance: NodeSDK | null,
  serviceName: string,
): Promise<void> {
  if (!sdkInstance) return;

  try {
    await sdkInstance.shutdown();
  } catch (error) {
    console.error(`[${serviceName}] Error shutting down observability:`, error);
  } finally {
    console.log(`[${serviceName}] Observability terminated`);
  }
}
