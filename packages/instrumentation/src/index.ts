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
import { inspect } from "node:util";

export interface ObservabilityConfig {
  serviceName: string;
  otlpEndpoint?: string;
  otlpHeaders?: string;
  serviceEnvironment?: string;
  serviceNamespace?: string;
}

let sdkInstance: NodeSDK | null = null;
let currentServiceName = "";

export function initObservability(config: ObservabilityConfig) {
  const {
    serviceName,
    otlpEndpoint,
    otlpHeaders,
    serviceEnvironment,
    serviceNamespace,
  } = config;

  if (serviceEnvironment !== "prod") {
    // Disable observability for non-production environments
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

  sdkInstance = new NodeSDK({
    resource: new Resource(resourceAttributes),
    resourceDetectors: detectors,
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
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdkInstance.start();
    // eslint-disable-next-line no-console
    console.log(`[${serviceName}] Observability initialized.`);
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
