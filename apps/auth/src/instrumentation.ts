import "dotenv/config";
import { initObservability } from "@lootlog/instrumentation";

initObservability({
  serviceName: process.env.SERVICE_NAME || "auth",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  serviceEnvironment: process.env.ENV,
  serviceNamespace: process.env.SERVICE_NAMESPACE,
  traceSampleRate: 0.1,
  forceEnable: false,
  enableDebugLogging: false,
  enableHostMetrics: false,
});
