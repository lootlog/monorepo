import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

export function initObservability(serviceName: string) {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const otlpHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;

  if (!otlpEndpoint || !otlpHeaders) {
    // eslint-disable-next-line no-console
    console.warn(
      `[${serviceName}] Observability skipped: OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_HEADERS not set.`,
    );
    return;
  }

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
    }),
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

  sdk.start();

  // eslint-disable-next-line no-console
  console.log(`[${serviceName}] Observability initialized.`);

  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log(`[${serviceName}] Observability terminated`)) // eslint-disable-line no-console
      .catch((error: unknown) =>
        console.log(`[${serviceName}] Error terminating observability`, error),
      ) // eslint-disable-line no-console
      .finally(() => process.exit(0));
  });
}

function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  headersString.split(",").forEach((header) => {
    const [key, value] = header.split("=");
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });
  return headers;
}
